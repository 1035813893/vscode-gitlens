import type { Disposable } from 'vscode';
import type { Container } from '../../container';
import type { ServerConnection } from '../subscription/serverConnection';
import type {
	WorkspaceRepositoryDescriptor,
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
    private _cloudWorkspaces: GKCloudWorkspace[] | undefined = undefined;
    private _workspacesApi: WorkspacesApi | undefined;

	constructor(private readonly container: Container, private readonly server: ServerConnection) {
        this._workspacesApi = new WorkspacesApi(this.container, this.server);
    }

    // TODO@ramint: Implement disposable
	dispose(): void {
	}

    private async loadCloudWorkspaces() {
        // Load GK cloud workspaces
        const cloudWorkspaces: GKCloudWorkspace[] = [];
        const workspaceResponse: WorkspacesResponse | undefined = await this._workspacesApi?.getWorkspacesWithRepos();
        const workspaces = workspaceResponse?.data?.projects?.nodes;
        if (workspaces?.length) {
            for (const workspace of workspaces) {
                const repositories: WorkspaceRepositoryDescriptor[] = workspace.provider_data?.repositories?.nodes ?? [];
                cloudWorkspaces.push(new GKCloudWorkspace(workspace.id, workspace.name, repositories));
            }
        }
        return cloudWorkspaces;
        // Load GK local workspaces
        // TODO@ramint: Implement this

        // Load current local workspace
        // TODO@ramint: Implement this
    }

    async getWorkspaces(): Promise<GKCloudWorkspace[]> {
        if (this._cloudWorkspaces == null) {
            this._cloudWorkspaces = await this.loadCloudWorkspaces();
        }

        return this._cloudWorkspaces;
    }
}
