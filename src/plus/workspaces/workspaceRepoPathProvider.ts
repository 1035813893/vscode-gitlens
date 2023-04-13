import type { Disposable } from 'vscode';
import type { Container } from '../../container';

export class WorkspaceRepoPathProvider implements Disposable {
	// TODO@ramint: Implement disposable
	private _disposable: Disposable | undefined;
	private _remoteUrlToRepositoryPathsMap: Map<string, string> | undefined = undefined;
	private _cloudWorkspaceIdToCustomRepoPathMap: Map<string, string> | undefined = undefined;

	/* We want to achieve the following with this provider:
        * 1. Maintain a map of remote url to repository path on disk. This includes reading from and writing to a file located in (UserFolder)/.gitkraken/workspaces/remoteUrlToRepositoryInfo.json.
             The file is a json file of the format:
            {
                "(some remote url)": {
                    "paths": [ Array of paths on disk that are mapped to the remote url ],
                    ...
                }
            }
            We want to:
             - Read the file on startup and populate the map
             - Return the set of paths mapped to a remote url on a getter function.
             - Write to the file when the map is updated. For starters, when a new path is added for a remote url, we will write to the file.
        * 2. Maintain a map of cloud workspace id to custom repository path on disk. This includes reading from and writing to a file located in (UserFolder)/.gitkraken/workspaces/cloudWorkspaceLocalSettings.json.
                The file is a json file of the format:
            {
                "workspaces": {
                    "(some cloud workspace id)": {
                        "settings": {
                            "customPaths": {
                                "(some repository id)": "(some custom path on disk)",
                                ...
                            }
                            ...
                        }
                    }
                }
            }
            We want to:
             - Read the file on startup and populate the map
             - Return the custom path mapped to a repository id on a getter function.
             - Write to the file when the map is updated. For starters, when a new custom path is added for a repository id, we will write to the file, overwriting any existing custom path for that repo id in that workspace id.
        * 3. Using a disposable, run file watching on the two files above to update the maps when the files are changed, and to expose an event that other components can subscribe to for changes to the maps.
    */

	constructor(private readonly container: Container) {
		// TODO@ramint: Implement disposable
	}

	// TODO@ramint: Implement disposable
	dispose(): void {}

	// TODO@ramint: Implement this
	private async loadRemoteUrlToRepositoryPathsMap() {}

	// TODO@ramint: Implement this
	private async loadCloudWorkspaceIdToCustomRepoPathMap() {}

	// TODO@ramint: Implement this
	private async writeRemoteUrlToRepositoryPathsMap() {}

	// TODO@ramint: Implement this
	private async writeCloudWorkspaceIdToCustomRepoPathMap() {}
}
