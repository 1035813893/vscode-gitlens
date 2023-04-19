import type { Disposable } from 'vscode';
import type { Container } from '../../container';
import type { ServerConnection } from '../subscription/serverConnection';
import type { CloudWorkspaceRepositoryDescriptor, LocalWorkspaceData, WorkspacesResponse } from './models';
import { GKCloudWorkspace, GKLocalWorkspace } from './models';
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
					new GKCloudWorkspace(workspace.id, workspace.name, this._getCloudWorkspaceRepos, repositories),
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

	async getWorkspaces(includeRepositories: boolean = false): Promise<(GKCloudWorkspace | GKLocalWorkspace)[]> {
		const workspaces: (GKCloudWorkspace | GKLocalWorkspace)[] = [];
		if (this._cloudWorkspaces == null) {
			this._cloudWorkspaces = await this.loadCloudWorkspaces(includeRepositories);
		}

		workspaces.push(...this._cloudWorkspaces);

		if (this._localWorkspaces == null) {
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
}
