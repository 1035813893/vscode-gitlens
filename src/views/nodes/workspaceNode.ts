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
import { gate } from '../../system/decorators/gate';
import { debug } from '../../system/decorators/log';
import type { WorkspacesView } from '../workspacesView';
import { MessageNode } from './common';
import { RepositoryNode } from './repositoryNode';
import { ViewNode } from './viewNode';

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
				let repo: Repository | undefined = undefined;
				let repoId: string | undefined = undefined;
				let repoLocalPath: string | undefined = undefined;
				let repoRemoteUrl: string | undefined = undefined;
				let repoName: string | undefined = undefined;
				let repoProvider: string | undefined = undefined;
				let repoOwner: string | undefined = undefined;
				if (this._type === WorkspaceType.Local) {
					repoLocalPath = (repository as LocalWorkspaceRepositoryDescriptor).localPath;
				} else if (this._type === WorkspaceType.Cloud) {
					repoId = (repository as CloudWorkspaceRepositoryDescriptor).id;
					repoLocalPath = await this.view.container.workspaces.getCloudWorkspaceRepoPath(
						this._workspace.id,
						repoId,
					);
					if (repoLocalPath == null) {
						repoRemoteUrl = (repository as CloudWorkspaceRepositoryDescriptor).url;
						repoName = (repository as CloudWorkspaceRepositoryDescriptor).name;
						repoProvider = (repository as CloudWorkspaceRepositoryDescriptor).provider;
						repoOwner = (repository as CloudWorkspaceRepositoryDescriptor).provider_organization_name;
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
				}

				let uri: Uri | undefined = undefined;
				if (repoLocalPath) {
					console.log('WORKSPACES GOT A LOCAL PATH FOR A REPO: ', repoLocalPath);
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

				if (repo == null) {
					this._children.push(new MessageNode(this.view, this, repository.name));
					continue;
				}

				this._children.push(new RepositoryNode(new GitUri(repo.uri), this.view as any, this, repo));
			}
		}

		return this._children;
	}

	getTreeItem(): TreeItem {
		const description = '';
		// const tooltip = new MarkdownString('', true);
		// TODO@ramint Icon needs to change based on workspace type
		// Note: Tooltips and commands can be resolved async too, in cases where we need to dynamically fetch the
		// info for it
		const icon: ThemeIcon = new ThemeIcon(this._type == WorkspaceType.Cloud ? 'cloud' : 'folder');

		const item = new TreeItem(this.name, TreeItemCollapsibleState.Collapsed);
		item.id = this.id;
		item.description = description;
		item.contextValue = '';
		item.iconPath = icon;
		item.tooltip = undefined;
		item.resourceUri = undefined;
		return item;
	}

	@gate()
	@debug()
	override refresh() {
		this._children = undefined;
	}
}

function encodeAuthority<T>(scheme: string, metadata?: T): string {
	return `${scheme}${metadata != null ? `+${encodeUtf8Hex(JSON.stringify(metadata))}` : ''}`;
}
