import type { Disposable } from 'vscode';
import { window } from 'vscode';
import type { Container } from '../../container';
import { RemoteResourceType } from '../../git/models/remoteResource';
import { showMessage } from '../../messages';
import { showRepositoryPicker } from '../../quickpicks/repositoryPicker';
import type { ServerConnection } from '../subscription/serverConnection';
import type {
	CloudWorkspaceProviderType,
	CloudWorkspaceRepositoryDescriptor,
	LocalWorkspaceData,
	WorkspacesResponse,
} from './models';
import {
	CloudWorkspaceProviderInputType,
	cloudWorkspaceProviderTypeToRemoteProviderId,
	GKCloudWorkspace,
	GKLocalWorkspace,
} from './models';
import { WorkspacesApi } from './workspacesApi';
import { WorkspacesLocalProvider } from './workspacesLocalProvider';

export class WorkspacesService implements Disposable {
	private _cloudWorkspaces: GKCloudWorkspace[] | undefined = undefined;
	private _localWorkspaces: GKLocalWorkspace[] | undefined = undefined;
	private _workspacesApi: WorkspacesApi | undefined;
	private _workspacesLocalProvider: WorkspacesLocalProvider | undefined;

	private readonly _getCloudWorkspaceRepos: (
		workspaceId: string,
	) => Promise<CloudWorkspaceRepositoryDescriptor[] | undefined> = async (workspaceId: string) => {
		const workspaceRepos = await this._workspacesApi?.getWorkspaceRepositories(workspaceId);
		return workspaceRepos?.data?.project?.provider_data?.repositories?.nodes;
	};

	constructor(private readonly container: Container, private readonly server: ServerConnection) {
		this._workspacesApi = new WorkspacesApi(this.container, this.server);
		this._workspacesLocalProvider = new WorkspacesLocalProvider();
	}

	dispose(): void {}

	private async loadCloudWorkspaces(includeRepositories: boolean = false) {
		const cloudWorkspaces: GKCloudWorkspace[] = [];
		const workspaceResponse: WorkspacesResponse | undefined = includeRepositories
			? await this._workspacesApi?.getWorkspacesWithRepos()
			: await this._workspacesApi?.getWorkspaces();
		const workspaces = workspaceResponse?.data?.projects?.nodes;
		if (workspaces?.length) {
			for (const workspace of workspaces) {
				const repositories: CloudWorkspaceRepositoryDescriptor[] = workspace.provider_data?.repositories?.nodes;
				cloudWorkspaces.push(
					new GKCloudWorkspace(
						workspace.id,
						workspace.name,
						workspace.provider as CloudWorkspaceProviderType,
						this._getCloudWorkspaceRepos,
						repositories,
					),
				);
			}
		}

		return cloudWorkspaces;
	}

	async refreshCloudWorkspaceRepos() {
		if (this._cloudWorkspaces == null) {
			this._cloudWorkspaces = await this.loadCloudWorkspaces();
		}

		for (const workspace of this._cloudWorkspaces) {
			void workspace.loadRepositories(true);
		}
	}

	private async loadLocalWorkspaces() {
		const localWorkspaces: GKLocalWorkspace[] = [];
		const workspaceFileData: LocalWorkspaceData =
			(await this._workspacesLocalProvider?.getLocalWorkspaceData())?.workspaces || {};
		for (const workspace of Object.values(workspaceFileData)) {
			localWorkspaces.push(
				new GKLocalWorkspace(
					workspace.localId,
					workspace.name,
					workspace.repositories.map(repositoryPath => ({
						localPath: repositoryPath.localPath,
						name: repositoryPath.localPath.split(/[\\/]/).pop() ?? 'unknown',
					})),
				),
			);
		}

		return localWorkspaces;
	}

	async getWorkspaces(options?: {
		includeCloudRepositories?: boolean;
		resetCloudWorkspaces?: boolean;
		resetLocalWorkspaces?: boolean;
	}): Promise<(GKCloudWorkspace | GKLocalWorkspace)[]> {
		const workspaces: (GKCloudWorkspace | GKLocalWorkspace)[] = [];
		if (this._cloudWorkspaces == null || options?.resetCloudWorkspaces) {
			this._cloudWorkspaces = await this.loadCloudWorkspaces(options?.includeCloudRepositories);
		}

		workspaces.push(...this._cloudWorkspaces);

		if (this._localWorkspaces == null || options?.resetLocalWorkspaces) {
			this._localWorkspaces = await this.loadLocalWorkspaces();
		}

		workspaces.push(...this._localWorkspaces);

		return workspaces;
	}

	async getCloudWorkspace(workspaceId: string): Promise<GKCloudWorkspace | undefined> {
		if (this._cloudWorkspaces == null) {
			this._cloudWorkspaces = await this.loadCloudWorkspaces();
		}

		return this._cloudWorkspaces?.find(workspace => workspace.id === workspaceId);
	}

	async getLocalWorkspace(workspaceId: string): Promise<GKLocalWorkspace | undefined> {
		if (this._localWorkspaces == null) {
			this._localWorkspaces = await this.loadLocalWorkspaces();
		}

		return this._localWorkspaces?.find(workspace => workspace.id === workspaceId);
	}

	async getCloudWorkspaceRepoPath(cloudWorkspaceId: string, repoId: string): Promise<string | undefined> {
		return this._workspacesLocalProvider?.getCloudWorkspaceRepoPath(cloudWorkspaceId, repoId);
	}

	async updateCloudWorkspaceRepoLocalPath(workspaceId: string, repoId: string, localPath: string): Promise<void> {
		await this._workspacesLocalProvider?.writeCloudWorkspaceDiskPathToMap(workspaceId, repoId, localPath);
	}

	async locateWorkspaceRepo(repoName: string, workspaceId?: string) {
		const repoLocatedUri = (
			await window.showOpenDialog({
				title: `Choose a location for ${repoName}`,
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
			})
		)?.[0];

		if (repoLocatedUri == null) {
			return;
		}

		const repo = await this.container.git.getOrOpenRepository(repoLocatedUri, {
			closeOnOpen: true,
			detectNested: false,
		});
		if (repo == null) {
			return;
		}

		const remoteUrls: string[] = [];
		for (const remote of await repo.getRemotes()) {
			const remoteUrl = remote.provider?.url({ type: RemoteResourceType.Repo });
			if (remoteUrl != null) {
				remoteUrls.push(remoteUrl);
			}
		}

		for (const remoteUrl of remoteUrls) {
			await this.container.localPath.writeLocalRepoPath({ remoteUrl: remoteUrl }, repoLocatedUri.path);
		}

		if (workspaceId != null) {
			const workspaceRepo = (await this.getCloudWorkspace(workspaceId))?.getRepository(repoName);
			if (workspaceRepo != null) {
				await this.container.localPath.writeLocalRepoPath(
					{
						remoteUrl: workspaceRepo.url,
						repoInfo: {
							provider: workspaceRepo.provider,
							owner: workspaceRepo.provider_organization_name,
							repoName: workspaceRepo.name,
						},
					},
					repoLocatedUri.path,
				);
				await this.container.workspaces.updateCloudWorkspaceRepoLocalPath(
					workspaceId,
					workspaceRepo.id,
					repoLocatedUri.path,
				);
			}
		}
	}

	async createCloudWorkspace(): Promise<void> {
		const input = window.createInputBox();
		const quickpick = window.createQuickPick();
		const quickpickLabelToProviderType: { [label: string]: CloudWorkspaceProviderInputType } = {
			GitHub: CloudWorkspaceProviderInputType.GitHub,
			'GitHub Enterprise': CloudWorkspaceProviderInputType.GitHubEnterprise,
			GitLab: CloudWorkspaceProviderInputType.GitLab,
			'GitLab Self-Managed': CloudWorkspaceProviderInputType.GitLabSelfHosted,
			Bitbucket: CloudWorkspaceProviderInputType.Bitbucket,
			Azure: CloudWorkspaceProviderInputType.Azure,
		};

		input.ignoreFocusOut = true;

		const disposables: Disposable[] = [];

		let workspaceName: string | undefined;
		let workspaceDescription = '';
		let workspaceProvider: CloudWorkspaceProviderInputType | undefined;
		let hostUrl: string | undefined;
		let azureOrganizationName: string | undefined;
		let azureProjectName: string | undefined;
		try {
			workspaceName = await new Promise<string | undefined>(resolve => {
				disposables.push(
					input.onDidHide(() => resolve(undefined)),
					input.onDidAccept(() => {
						const value = input.value.trim();
						if (!value) {
							input.validationMessage = 'Please enter a non-empty name for the workspace';
							return;
						}

						resolve(value);
					}),
				);

				input.title = 'Create Workspace';
				input.placeholder = 'Please enter a name for the new workspace';
				input.prompt = 'Enter your workspace name';
				input.show();
			});

			if (!workspaceName) return;

			workspaceDescription = await new Promise<string>(resolve => {
				disposables.push(
					input.onDidHide(() => resolve('')),
					input.onDidAccept(() => {
						const value = input.value.trim();
						resolve(value || '');
					}),
				);

				input.value = '';
				input.title = 'Create Workspace';
				input.placeholder = 'Please enter a description for the new workspace';
				input.prompt = 'Enter your workspace description';
				input.show();
			});

			workspaceProvider = await new Promise<CloudWorkspaceProviderInputType | undefined>(resolve => {
				disposables.push(
					quickpick.onDidHide(() => resolve(undefined)),
					quickpick.onDidAccept(() => {
						if (quickpick.activeItems.length !== 0) {
							resolve(quickpickLabelToProviderType[quickpick.activeItems[0].label]);
						}
					}),
				);

				quickpick.title = 'Create Workspace';
				quickpick.placeholder = 'Please select a provider for the new workspace';
				quickpick.items = Object.keys(quickpickLabelToProviderType).map(label => ({ label: label }));
				quickpick.canSelectMany = false;
				quickpick.show();
			});

			if (!workspaceProvider) return;

			if (
				workspaceProvider == CloudWorkspaceProviderInputType.GitHubEnterprise ||
				workspaceProvider == CloudWorkspaceProviderInputType.GitLabSelfHosted
			) {
				hostUrl = await new Promise<string | undefined>(resolve => {
					disposables.push(
						input.onDidHide(() => resolve(undefined)),
						input.onDidAccept(() => {
							const value = input.value.trim();
							if (!value) {
								input.validationMessage = 'Please enter a non-empty host URL for the workspace';
								return;
							}

							resolve(value);
						}),
					);

					input.value = '';
					input.title = 'Create Workspace';
					input.placeholder = 'Please enter a host URL for the new workspace';
					input.prompt = 'Enter your workspace host URL';
					input.show();
				});

				if (!hostUrl) return;
			}

			if (workspaceProvider == CloudWorkspaceProviderInputType.Azure) {
				azureOrganizationName = await new Promise<string | undefined>(resolve => {
					disposables.push(
						input.onDidHide(() => resolve(undefined)),
						input.onDidAccept(() => {
							const value = input.value.trim();
							if (!value) {
								input.validationMessage =
									'Please enter a non-empty organization name for the workspace';
								return;
							}

							resolve(value);
						}),
					);

					input.value = '';
					input.title = 'Create Workspace';
					input.placeholder = 'Please enter an organization name for the new workspace';
					input.prompt = 'Enter your workspace organization name';
					input.show();
				});

				if (!azureOrganizationName) return;

				azureProjectName = await new Promise<string | undefined>(resolve => {
					disposables.push(
						input.onDidHide(() => resolve(undefined)),
						input.onDidAccept(() => {
							const value = input.value.trim();
							if (!value) {
								input.validationMessage = 'Please enter a non-empty project name for the workspace';
								return;
							}

							resolve(value);
						}),
					);

					input.value = '';
					input.title = 'Create Workspace';
					input.placeholder = 'Please enter a project name for the new workspace';
					input.prompt = 'Enter your workspace project name';
					input.show();
				});

				if (!azureProjectName) return;
			}
		} finally {
			input.dispose();
			quickpick.dispose();
			disposables.forEach(d => void d.dispose());
		}

		const options = {
			name: workspaceName,
			description: workspaceDescription,
			provider: workspaceProvider,
			hostUrl: hostUrl,
			azureOrganizationName: azureOrganizationName,
			azureProjectName: azureProjectName,
		};

		await this._workspacesApi?.createWorkspace(options);
		await this.getWorkspaces({ includeCloudRepositories: true, resetCloudWorkspaces: true });
	}

	async deleteCloudWorkspace(workspaceId: string) {
		const confirmation = await showMessage(
			'warn',
			'Are you sure you want to delete this workspace? This cannot be undone.',
			undefined,
			null,
			{ title: 'Confirm' },
			{ title: 'Cancel', isCloseAffordance: true },
		);
		if (confirmation == null || confirmation.title == 'Cancel') return;
		await this._workspacesApi?.deleteWorkspace(workspaceId);
		await this.getWorkspaces({ includeCloudRepositories: true, resetCloudWorkspaces: true });
	}

	async addCloudWorkspaceRepo(workspaceId: string) {
		const workspace = await this.getCloudWorkspace(workspaceId);
		if (workspace == null) return;

		const matchingProviderRepos = this.container.git.openRepositories.filter(
			r =>
				r.provider != null &&
				cloudWorkspaceProviderTypeToRemoteProviderId[workspace.provider] === r.provider.id,
		);
		if (!matchingProviderRepos.length) {
			void window.showInformationMessage(`No open repositories found for provider ${workspace.provider}`);
			return;
		}

		const pick = await showRepositoryPicker(
			'Add Repository to Workspace',
			'Choose which repository to add to the workspace',
			matchingProviderRepos,
		);
		if (pick?.item == null) return;

		const repoPath = pick.repoPath;
		const repo = this.container.git.getRepository(repoPath);
		if (repo == null) return;

		const remote = (await repo.getRemote('origin')) || (await repo.getRemotes())?.[0];
		const remoteOwnerAndName = remote?.provider?.path.split('/');
		if (remoteOwnerAndName == null || remoteOwnerAndName.length !== 2) return;
		await this._workspacesApi?.addReposToWorkspace(workspaceId, [
			{ owner: remoteOwnerAndName[0], repoName: remoteOwnerAndName[1] },
		]);
		await this.getWorkspaces({ includeCloudRepositories: true, resetCloudWorkspaces: true });
	}

	async removeCloudWorkspaceRepo(workspaceId: string, repoName: string) {
		const repo = (await this.getCloudWorkspace(workspaceId))?.getRepository(repoName);
		if (repo == null) return;

		const confirmation = await showMessage(
			'warn',
			`Are you sure you want to remove ${repoName} from this workspace? This cannot be undone.`,
			undefined,
			null,
			{ title: 'Confirm' },
			{ title: 'Cancel', isCloseAffordance: true },
		);
		if (confirmation == null || confirmation.title == 'Cancel') return;
		await this._workspacesApi?.removeReposFromWorkspace(workspaceId, [
			{ owner: repo.provider_organization_name, repoName: repo.name },
		]);
		await this.getWorkspaces({ includeCloudRepositories: true, resetCloudWorkspaces: true });
	}
}
