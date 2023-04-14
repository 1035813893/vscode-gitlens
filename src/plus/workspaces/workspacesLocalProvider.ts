// eslint-disable-next-line no-restricted-imports
import os from 'os';
// eslint-disable-next-line no-restricted-imports
import path from 'path';
import { Uri, workspace } from 'vscode';
import { getPlatform } from '@env/platform';
import type { CloudWorkspacesPathMap, LocalWorkspaceFileData } from './models';
import {
	cloudWorkspaceDataFilePath,
	localGKSharedDataFolder,
	localGKSharedDataLegacyFolder,
	localWorkspaceDataFilePath,
	localWorkspaceDataLegacyFilePath,
} from './models';

export class WorkspacesLocalProvider {
	private _cloudWorkspaceRepoPathMap: CloudWorkspacesPathMap | undefined = undefined;

	private async acquireWriteLock(): Promise<boolean> {
		const lockFilePath = path.join(os.homedir(), localGKSharedDataFolder, 'lockfile');
		let existingLockFileData;
		while (true) {
			try {
				existingLockFileData = await workspace.fs.readFile(Uri.file(lockFilePath));
			} catch (error) {
				// File does not exist, so we can safely create it
				break;
			}

			const existingLockFileTimestamp = parseInt(existingLockFileData.toString());
			if (isNaN(existingLockFileTimestamp)) {
				// File exists, but the timestamp is invalid, so we can safely remove it
				break;
			}

			const currentTime = new Date().getTime();
			if (currentTime - existingLockFileTimestamp > 30000) {
				// File exists, but the timestamp is older than 30 seconds, so we can safely remove it
				break;
			}

			// File exists, and the timestamp is less than 30 seconds old, so we need to wait for it to be removed
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		// Create the lockfile with the current timestamp
		const lockFileData = new Uint8Array(Buffer.from(new Date().getTime().toString()));

		try {
			// write the lockfile to the shared data folder
			await workspace.fs.writeFile(Uri.file(lockFilePath), lockFileData);
		} catch (error) {
			return false;
		}

		return true;
	}

	private async releaseWriteLock(): Promise<void> {
		const lockFilePath = path.join(os.homedir(), localGKSharedDataFolder, 'lockfile');
		try {
			await workspace.fs.delete(Uri.file(lockFilePath));
		} catch (error) {}
	}

	private async ensureCloudWorkspaceRepoPathMap() {
		if (this._cloudWorkspaceRepoPathMap == null) {
			await this.loadCloudWorkspaceRepoPathMap();
		}
	}

	async getCloudWorkspaceRepoPathMap(): Promise<CloudWorkspacesPathMap> {
		await this.ensureCloudWorkspaceRepoPathMap();
		return this._cloudWorkspaceRepoPathMap ?? {};
	}

	async loadCloudWorkspaceRepoPathMap() {
		const localFilePath = path.join(os.homedir(), localGKSharedDataFolder, cloudWorkspaceDataFilePath);
		try {
			const data = await workspace.fs.readFile(Uri.file(localFilePath));
			this._cloudWorkspaceRepoPathMap = (JSON.parse(data.toString())?.workspaces ?? {}) as CloudWorkspacesPathMap;
		} catch (error) {}
	}

	async writeCloudWorkspaceDiskPathToMap(cloudWorkspaceId: string, repoId: string, repoLocalPath: string) {
		await this.acquireWriteLock();
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
		await this.releaseWriteLock();
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
