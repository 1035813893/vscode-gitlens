import type { Disposable } from 'vscode';
import type { Container } from '../../container';
import type { ServerConnection } from '../subscription/serverConnection';
import type {
	Workspace,
	WorkspaceRepositoryInfo,
	WorkspacesResponse,
} from './models';
import {
    GKCloudWorkspace,
} from './models';
import {
    WorkspacesApi
} from './workspacesApi';

export class WorkspacesService implements Disposable {
    // TODO@ramint: Implement disposable
    private _disposable: Disposable | undefined;
    // TODO@ramint: Abstract this further to include local workspaces
    private _cloudWorkspaces: GKCloudWorkspace[] = [];
    private _workspacesApi: WorkspacesApi | undefined;

	constructor(private readonly container: Container, private readonly server: ServerConnection) {
        this._workspacesApi = new WorkspacesApi(this.container, this.server);
    }

    // TODO@ramint: Implement disposable
	dispose(): void {
	}


    get cloudWorkspaces(): GKCloudWorkspace[] {
        return this._cloudWorkspaces;
    }

    async loadWorkspaces() {
        // Load GK cloud workspaces
        const cloudWorkspaces: GKCloudWorkspace[] = [];
        const workspaceResponse: WorkspacesResponse | undefined = await this._workspacesApi?.getWorkspacesWithRepos();
        const workspaces = workspaceResponse?.data?.projects?.nodes;
        if (workspaces?.length) {
            workspaces.forEach((workspace: Workspace) => {
                const repositories: WorkspaceRepositoryInfo[] = workspace.provider_data?.repositories?.nodes ?? [];
                cloudWorkspaces.push(new GKCloudWorkspace(workspace.id, workspace.name, repositories));
            });
        }
        this._cloudWorkspaces = cloudWorkspaces;

        // Load GK local workspaces
        // TODO@ramint: Implement this

        // Load current local workspace
        // TODO@ramint: Implement this
    }
}
