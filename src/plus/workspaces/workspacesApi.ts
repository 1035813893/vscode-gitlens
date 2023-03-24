import type { Disposable } from 'vscode';
import type { Container } from '../../container';
import { Logger } from '../../system/logger';
import type { ServerConnection } from '../subscription/serverConnection';
import type {
	WorkspacesResponse,
} from './models';


export class WorkspacesApi implements Disposable {
	// private _disposable: Disposable;

	constructor(private readonly container: Container, private readonly server: ServerConnection) {}

	dispose(): void {
		// this._disposable?.dispose();
	}

	private async getAccessToken() {
		// TODO: should probably get scopes from somewhere
		const sessions = await this.container.subscriptionAuthentication.getSessions(['gitlens']);
		if (!sessions.length) {
			return;
		}

		const session = sessions[0];
		return session.accessToken;
	}

	async getWorkspacesWithRepos(): Promise<WorkspacesResponse | undefined> {
		const accessToken = await this.getAccessToken();
		if (accessToken == null) {
			return;
		}

		const rsp = await this.server.fetchGraphql(
			{
				query: `
                    query getWorkspaces {
                        projects (first: 100) {
                            total_count
                            page_info {
                                end_cursor
                                has_next_page
                            }
                            nodes {
                                id
                                name
                                description
                                provider
                                provider_data {
                                    repositories (first: 100) {
                                        total_count
                                        page_info {
                                            start_cursor
                                            has_next_page
                                        }
                                        nodes {
                                            id
                                            name
                                            description
                                            repository_id
                                            provider
                                            url
                                        }
                                    }
                                }
                            }
                        }
                    }
				`,
			},
			accessToken,
		);

		if (!rsp.ok) {
			Logger.error(undefined, `Getting workspaces failed: (${rsp.status}) ${rsp.statusText}`);
			throw new Error(rsp.statusText);
		}

		const json: WorkspacesResponse | undefined = await rsp.json() as WorkspacesResponse | undefined;

		return json;
	}

	async createWorkspace(): Promise<void> {}

	async ensureWorkspace(): Promise<void> {}
}
