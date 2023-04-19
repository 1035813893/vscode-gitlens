import type { Disposable } from 'vscode';
import { window } from 'vscode';
import type { WorkspacesViewConfig } from '../config';
import type { Container } from '../container';
import { unknownGitUri } from '../git/gitUri';
import { RemoteResourceType } from '../git/models/remoteResource';
import { GKCloudWorkspace } from '../plus/workspaces/models';
import { RepositoryNode } from './nodes/repositoryNode';
import type { WorkspaceMissingRepositoryNode } from './nodes/workspaceMissingRepositoryNode';
import type { WorkspaceNode } from './nodes/workspaceNode';
import { WorkspacesViewNode } from './nodes/workspacesViewNode';
import { ViewBase } from './viewBase';
import { registerViewCommand } from './viewCommands';

export class WorkspacesView extends ViewBase<WorkspacesViewNode, WorkspacesViewConfig> {
	protected readonly configKey = 'repositories';

	constructor(container: Container) {
		super(container, 'gitlens.views.workspaces', 'Workspaces', 'workspaceView');
	}

	override get canSelectMany(): boolean {
		return false;
	}

	protected getRoot() {
		return new WorkspacesViewNode(unknownGitUri, this);
	}

	override get canReveal(): boolean {
		return false;
	}

	protected async locateWorkspaceRepo(repoName: string, workspace?: GKCloudWorkspace) {
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

		// GET ALL THE REMOTE URLS AND WRITE THEM TO LOCAL PATHS
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

		if (workspace != null) {
			const workspaceRepo = workspace.getRepository(repoName);
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
					workspace.id,
					workspaceRepo.id,
					repoLocatedUri.path,
				);
			}
		}
	}

	protected registerCommands(): Disposable[] {
		void this.container.viewCommands;

		return [
			registerViewCommand(
				this.getQualifiedCommand('refresh'),
				() => {
					return this.refresh(true);
				},
				this,
			),
			registerViewCommand(
				this.getQualifiedCommand('locateRepo'),
				async (node: RepositoryNode | WorkspaceMissingRepositoryNode) => {
					let repoName = undefined;
					let workspaceNode = undefined;
					let workspace = undefined;
					if (node instanceof RepositoryNode) {
						repoName = node.repo.name;
						workspaceNode = node.getParent() as WorkspaceNode;
						workspace = workspaceNode.workspace;
					} else {
						repoName = node.name;
					}

					await this.locateWorkspaceRepo(
						repoName,
						workspace instanceof GKCloudWorkspace ? workspace : undefined,
					);
					if (workspaceNode != null) {
						void workspaceNode.triggerChange(true);
					}
				},
				this,
			),
			registerViewCommand(
				this.getQualifiedCommand('create'),
				async () => {
					await this.container.workspaces.createCloudWorkspace();
					void this.ensureRoot().triggerChange(true);
				},
				this,
			),
			registerViewCommand(
				this.getQualifiedCommand('delete'),
				async (node: WorkspaceNode) => {
					await this.container.workspaces.deleteCloudWorkspace(node.workspaceId);
					void node.getParent()?.triggerChange(true);
				},
				this,
			),
		];
	}
}
