import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from 'vscode';
import { encodeUtf8Hex } from '@env/hex';
import { Schemes } from '../../constants';
import { GitUri } from '../../git/gitUri';
import type { GitHubAuthorityMetadata } from '../../plus/remotehub';
import type { GKCloudWorkspace, WorkspaceRepositoryDescriptor } from '../../plus/workspaces/models';
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

	private _workspace: GKCloudWorkspace | undefined;
	constructor(uri: GitUri, view: WorkspacesView, parent: ViewNode, public readonly workspace: GKCloudWorkspace) {
		super(uri, view, parent);

		this._workspace = workspace;
	}

	override get id(): string {
		return WorkspaceNode.getId(this._workspace?.id ?? '');
	}

	get name(): string {
		return this._workspace?.name ?? '';
	}

	private async getRepositories(): Promise<WorkspaceRepositoryDescriptor[]> {
		return Promise.resolve(this._workspace?.repositories ?? []);
	}

	private _children: ViewNode[] | undefined;

	async getChildren(): Promise<ViewNode[]> {
		if (this._children == null) {
			this._children = [];

			for (const repository of await this.getRepositories()) {
				let uri = Uri.parse(repository.url);
				uri = uri.with({
					scheme: Schemes.Virtual,
					authority: encodeAuthority<GitHubAuthorityMetadata>('github'),
					path: uri.path,
				});

				const repo = await this.view.container.git.getOrOpenRepository(uri, { closeOnOpen: true });
				if (repo == null) {
					this._children.push(
						new MessageNode(
							this.view,
							this,
							repository.name,
						),
					);
					continue;
				}

				// TODO@ramint We will want this to be a proper WorkspacesRepositoryNode with info and interactions
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
		const icon: ThemeIcon = new ThemeIcon('cloud');

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
		this._workspace = undefined;
	}
}

function encodeAuthority<T>(scheme: string, metadata?: T): string {
	return `${scheme}${metadata != null ? `+${encodeUtf8Hex(JSON.stringify(metadata))}` : ''}`;
}
