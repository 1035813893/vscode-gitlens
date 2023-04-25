import type { LocalWorkspaceFileData } from './models';

export interface WorkspacesPathProvider {
	getCloudWorkspaceRepoPath(cloudWorkspaceId: string, repoId: string): Promise<string | undefined>;

	writeCloudWorkspaceDiskPathToMap(cloudWorkspaceId: string, repoId: string, repoLocalPath: string): Promise<void>;

	getLocalWorkspaceData(): Promise<LocalWorkspaceFileData>;
}
