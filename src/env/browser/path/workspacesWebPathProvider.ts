import type { LocalWorkspaceFileData } from '../../../plus/workspaces/models';
import type { WorkspacesPathProvider } from '../../../plus/workspaces/workspacesPathProvider';

export class WorkspacesWebPathProvider implements WorkspacesPathProvider {
	async getCloudWorkspaceRepoPath(_cloudWorkspaceId: string, _repoId: string): Promise<string | undefined> {
		return undefined;
	}

	async writeCloudWorkspaceDiskPathToMap(
		_cloudWorkspaceId: string,
		_repoId: string,
		_repoLocalPath: string,
	): Promise<void> {}

	async getLocalWorkspaceData(): Promise<LocalWorkspaceFileData> {
		return { workspaces: {} };
	}
}
