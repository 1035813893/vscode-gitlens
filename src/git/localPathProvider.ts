// eslint-disable-next-line no-restricted-imports
import os from 'os';
// eslint-disable-next-line no-restricted-imports
import path from 'path';
import type { Disposable } from 'vscode';
import { Uri, workspace } from 'vscode';
import { localGKSharedDataFolder } from '../constants';
import type { Container } from '../container';
import type { LocalRepoDataMap } from './models/localPath';
import { localRepoMappingFilePath } from './models/localPath';

export class LocalPathProvider implements Disposable {
	constructor(private readonly container: Container) {}

	dispose() {}

	private _localRepoDataMap: LocalRepoDataMap | undefined = undefined;

	private async ensureLocalRepoDataMap() {
		if (this._localRepoDataMap == null) {
			await this.loadLocalRepoDataMap();
		}
	}

	private async getLocalRepoDataMap(): Promise<LocalRepoDataMap> {
		await this.ensureLocalRepoDataMap();
		return this._localRepoDataMap ?? {};
	}

	async getLocalRepoPaths(options: {
		remoteUrl?: string;
		repoInfo?: { provider: string; owner: string; repoName: string };
	}): Promise<string[]> {
		const paths: string[] = [];
		if (options.remoteUrl != null) {
			const remoteUrlPaths = await this._getLocalRepoPaths(options.remoteUrl);
			if (remoteUrlPaths != null) {
				paths.push(...remoteUrlPaths);
			}
		}
		if (options.repoInfo != null) {
			const { provider, owner, repoName } = options.repoInfo;
			const repoInfoPaths = await this._getLocalRepoPaths(`${provider}/${owner}/${repoName}`);
			if (repoInfoPaths != null) {
				paths.push(...repoInfoPaths);
			}
		}

		return paths;
	}

	private async _getLocalRepoPaths(key: string): Promise<string[] | undefined> {
		const localRepoDataMap = await this.getLocalRepoDataMap();
		return localRepoDataMap[key]?.paths;
	}

	private async loadLocalRepoDataMap() {
		const localFilePath = path.join(os.homedir(), localGKSharedDataFolder, localRepoMappingFilePath);
		try {
			const data = await workspace.fs.readFile(Uri.file(localFilePath));
			this._localRepoDataMap = (JSON.parse(data.toString()) ?? {}) as LocalRepoDataMap;
		} catch (error) {}
	}

	async writeLocalRepoPath(
		options: { remoteUrl?: string; repoInfo?: { provider: string; owner: string; repoName: string } },
		localPath: string,
	): Promise<void> {
		if (options.remoteUrl != null) {
			await this._writeLocalRepoPath(options.remoteUrl, localPath);
		}
		if (options.repoInfo != null) {
			const { provider, owner, repoName } = options.repoInfo;
			const key = `${provider}/${owner}/${repoName}`;
			await this._writeLocalRepoPath(key, localPath);
		}
	}

	private async _writeLocalRepoPath(key: string, localPath: string): Promise<void> {
		await acquireSharedFolderWriteLock();
		await this.loadLocalRepoDataMap();
		if (this._localRepoDataMap == null) {
			this._localRepoDataMap = {};
		}

		if (this._localRepoDataMap[key] == null || this._localRepoDataMap[key].paths == null) {
			this._localRepoDataMap[key] = { paths: [localPath] };
		} else if (!this._localRepoDataMap[key].paths.includes(localPath)) {
			this._localRepoDataMap[key].paths.push(localPath);
		}
		const localFilePath = path.join(os.homedir(), localGKSharedDataFolder, localRepoMappingFilePath);
		const outputData = new Uint8Array(Buffer.from(JSON.stringify(this._localRepoDataMap)));
		await workspace.fs.writeFile(Uri.file(localFilePath), outputData);
		await releaseSharedFolderWriteLock();
	}
}

export async function acquireSharedFolderWriteLock(): Promise<boolean> {
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

export async function releaseSharedFolderWriteLock(): Promise<void> {
	const lockFilePath = path.join(os.homedir(), localGKSharedDataFolder, 'lockfile');
	try {
		await workspace.fs.delete(Uri.file(lockFilePath));
	} catch (error) {}
}
