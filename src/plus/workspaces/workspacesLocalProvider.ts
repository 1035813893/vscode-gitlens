// eslint-disable-next-line no-restricted-imports
import os from 'os';
// eslint-disable-next-line no-restricted-imports
import path from 'path';
import { Uri, workspace } from 'vscode';
import { getPlatform } from '@env/platform';
import { localGKSharedDataFolder, localGKSharedDataLegacyFolder } from '../../constants';
import { acquireSharedFolderWriteLock, releaseSharedFolderWriteLock } from '../../git/localPathProvider';
import type { CloudWorkspacesPathMap, LocalWorkspaceFileData } from './models';
import { cloudWorkspaceDataFilePath, localWorkspaceDataFilePath, localWorkspaceDataLegacyFilePath } from './models';

export class WorkspacesLocalProvider {
	private _cloudWorkspaceRepoPathMap: CloudWorkspacesPathMap | undefined = undefined;

	private async ensureCloudWorkspaceRepoPathMap() {
		if (this._cloudWorkspaceRepoPathMap == null) {
			await this.loadCloudWorkspaceRepoPathMap();
		}
	}

	private async getCloudWorkspaceRepoPathMap(): Promise<CloudWorkspacesPathMap> {
		await this.ensureCloudWorkspaceRepoPathMap();
		return this._cloudWorkspaceRepoPathMap ?? {};
	}

	async getCloudWorkspaceRepoPath(cloudWorkspaceId: string, repoId: string): Promise<string | undefined> {
		const cloudWorkspaceRepoPathMap = await this.getCloudWorkspaceRepoPathMap();
		return cloudWorkspaceRepoPathMap[cloudWorkspaceId]?.repoPaths[repoId];
	}

	async loadCloudWorkspaceRepoPathMap() {
		const localFilePath = path.join(os.homedir(), localGKSharedDataFolder, cloudWorkspaceDataFilePath);
		try {
			const data = await workspace.fs.readFile(Uri.file(localFilePath));
			this._cloudWorkspaceRepoPathMap = (JSON.parse(data.toString())?.workspaces ?? {}) as CloudWorkspacesPathMap;
		} catch (error) {}
	}

	async writeCloudWorkspaceDiskPathToMap(cloudWorkspaceId: string, repoId: string, repoLocalPath: string) {
		await acquireSharedFolderWriteLock();
		await this.loadCloudWorkspaceRepoPathMap();
		if (this._cloudWorkspaceRepoPathMap == null) {
			this._cloudWorkspaceRepoPathMap = {};
		}

		if (this._cloudWorkspaceRepoPathMap[cloudWorkspaceId] == null) {
			this._cloudWorkspaceRepoPathMap[cloudWorkspaceId] = { repoPaths: {} };
		}

		this._cloudWorkspaceRepoPathMap[cloudWorkspaceId].repoPaths[repoId] = repoLocalPath;

		const localFilePath = path.join(os.homedir(), localGKSharedDataFolder, cloudWorkspaceDataFilePath);
		const outputData = new Uint8Array(Buffer.from(JSON.stringify({ workspaces: this._cloudWorkspaceRepoPathMap })));
		await workspace.fs.writeFile(Uri.file(localFilePath), outputData);
		await releaseSharedFolderWriteLock();
	}

	// TODO@ramint: May want a file watcher on this file down the line
	async getLocalWorkspaceData(): Promise<LocalWorkspaceFileData> {
		// Read from file at path defined in the constant localWorkspaceDataFilePath
		// If file does not exist, create it and return an empty object
		let localFilePath;
		let data;
		try {
			localFilePath = path.join(os.homedir(), localGKSharedDataFolder, localWorkspaceDataFilePath);
			data = await workspace.fs.readFile(Uri.file(localFilePath));
			return JSON.parse(data.toString()) as LocalWorkspaceFileData;
		} catch (error) {
			// Fall back to using legacy location for file
			try {
				localFilePath = path.join(
					os.homedir(),
					`${getPlatform() === 'windows' ? '/AppData/Roaming/' : null}${localGKSharedDataLegacyFolder}`,
					localWorkspaceDataLegacyFilePath,
				);
				data = await workspace.fs.readFile(Uri.file(localFilePath));
				return JSON.parse(data.toString()) as LocalWorkspaceFileData;
			} catch (error) {}
		}

		return { workspaces: {} };
	}
}
