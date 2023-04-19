import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { encodeUtf8Hex } from '@env/hex';
import { Schemes } from '../../constants';
import { GitUri } from '../../git/gitUri';
import type { Repository } from '../../git/models/repository';
import type { GitHubAuthorityMetadata } from '../../plus/remotehub';
import type {
	CloudWorkspaceRepositoryDescriptor,
	GKCloudWorkspace,
	GKLocalWorkspace,
	LocalWorkspaceRepositoryDescriptor,
} from '../../plus/workspaces/models';
import { WorkspaceType } from '../../plus/workspaces/models';
import type { WorkspacesView } from '../workspacesView';
import { RepositoryNode } from './repositoryNode';
import { ContextValues, ViewNode } from './viewNode';
import { WorkspaceMissingRepositoryNode } from './workspaceMissingRepositoryNode';

export class WorkspaceNode extends ViewNode<WorkspacesView> {
	static key = ':workspace';
	static getId(workspaceId: string): string {
		return `gitlens${this.key}(${workspaceId})`;
	}

	private _workspace: GKCloudWorkspace | GKLocalWorkspace;
	private _type: WorkspaceType;

	constructor(
		uri: GitUri,
		view: WorkspacesView,
		parent: ViewNode,
		public readonly workspace: GKCloudWorkspace | GKLocalWorkspace,
	) {
		super(uri, view, parent);
		this._workspace = workspace;
		this._type = workspace.type;
	}

	override get id(): string {
		return WorkspaceNode.getId(this._workspace.id ?? '');
	}

	get name(): string {
		return this._workspace?.name ?? '';
	}

	get workspaceId(): string {
		return this._workspace.id ?? '';
	}

	private async getRepositories(): Promise<
		CloudWorkspaceRepositoryDescriptor[] | LocalWorkspaceRepositoryDescriptor[]
	> {
		return Promise.resolve(this._workspace?.repositories ?? []);
	}

	private _children: ViewNode[] | undefined;

	async getChildren(): Promise<ViewNode[]> {
		if (this._children == null) {
			this._children = [];

			for (const repository of await this.getRepositories()) {
				const currentRepositories = this.view.container.git.repositories;
				let repo: Repository | undefined = undefined;
				let repoId: string | undefined = undefined;
				let repoLocalPath: string | undefined = undefined;
				let repoRemoteUrl: string | undefined = undefined;
				let repoName: string | undefined = undefined;
				let repoProvider: string | undefined = undefined;
				let repoOwner: string | undefined = undefined;
				if (this._type === WorkspaceType.Local) {
					repoLocalPath = (repository as LocalWorkspaceRepositoryDescriptor).localPath;
					// repo name in this case is the last part of the path after splitting from the path separator
					repoName = (repository as LocalWorkspaceRepositoryDescriptor).name;
					for (const currentRepository of currentRepositories) {
						if (currentRepository.path.replace('\\', '/') === repoLocalPath.replace('\\', '/')) {
							repo = currentRepository;
						}
					}
				} else if (this._type === WorkspaceType.Cloud) {
					repoId = (repository as CloudWorkspaceRepositoryDescriptor).id;
					repoLocalPath = await this.view.container.workspaces.getCloudWorkspaceRepoPath(
						this._workspace.id,
						repoId,
					);
					repoRemoteUrl = (repository as CloudWorkspaceRepositoryDescriptor).url;
					repoName = (repository as CloudWorkspaceRepositoryDescriptor).name;
					repoProvider = (repository as CloudWorkspaceRepositoryDescriptor).provider;
					repoOwner = (repository as CloudWorkspaceRepositoryDescriptor).provider_organization_name;

					if (repoLocalPath == null) {
						const repoLocalPaths = await this.view.container.localPath.getLocalRepoPaths({
							remoteUrl: repoRemoteUrl,
							repoInfo: {
								repoName: repoName,
								provider: repoProvider,
								owner: repoOwner,
							},
						});

						// TODO@ramint: The user should be able to choose which path to use if multiple available
						if (repoLocalPaths.length > 0) {
							repoLocalPath = repoLocalPaths[0];
						}
					}

					for (const currentRepository of currentRepositories) {
						if (
							repoLocalPath != null &&
							currentRepository.path.replace('\\', '/') === repoLocalPath.replace('\\', '/')
						) {
							repo = currentRepository;
						}
					}
				}

				if (!repo) {
					let uri: Uri | undefined = undefined;
					if (repoLocalPath) {
						uri = Uri.file(repoLocalPath);
					} else if (repoRemoteUrl) {
						uri = Uri.parse(repoRemoteUrl);
						uri = uri.with({
							scheme: Schemes.Virtual,
							authority: encodeAuthority<GitHubAuthorityMetadata>('github'),
							path: uri.path,
						});
					}
					if (uri) {
						repo = await this.view.container.git.getOrOpenRepository(uri, { closeOnOpen: true });
					}
				}

				if (!repo) {
					this._children.push(
						new WorkspaceMissingRepositoryNode(this.view, this, this._workspace.id, repoName || 'unknown'),
					);
					continue;
				}

				this._children.push(
					new RepositoryNode(GitUri.fromRepoPath(repo.path), this.view, this, repo, {
						workspace: this._workspace,
					}),
				);
			}
		}

		return this._children;
	}

	getTreeItem(): TreeItem {
		const description = '';
		// TODO@ramint Icon needs to change based on workspace type, and need a tooltip.
		const icon: ThemeIcon = new ThemeIcon(this._type == WorkspaceType.Cloud ? 'cloud' : 'folder');

		const item = new TreeItem(this.name, TreeItemCollapsibleState.Collapsed);
		let contextValue = `${ContextValues.Workspace}`;

		if (this._type === WorkspaceType.Cloud) {
			contextValue += '+cloud';
		} else {
			contextValue += '+local';
		}
		item.id = this.id;
		item.description = description;
		item.contextValue = contextValue;
		item.iconPath = icon;
		item.tooltip = undefined;
		item.resourceUri = undefined;
		return item;
	}

	override refresh() {
		this._children = undefined;
	}
}

function encodeAuthority<T>(scheme: string, metadata?: T): string {
	return `${scheme}${metadata != null ? `+${encodeUtf8Hex(JSON.stringify(metadata))}` : ''}`;
}
