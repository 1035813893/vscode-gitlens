import { MarkdownString, ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import type { GitUri } from '../../git/gitUri';
import { gate } from '../../system/decorators/gate';
import { debug } from '../../system/decorators/log';
import type { GKWorkspace } from '../../workspaces';
import type { WorkspacesView } from '../workspacesView';
import { MessageNode } from './common';
import { ViewNode } from './viewNode';

export class WorkspaceNode extends ViewNode<WorkspacesView> {
	static key = ':workspace';
	static getId(workspaceId: string): string {
		return `gitlens${this.key}(${workspaceId})`;
	}

	private _workspace: GKWorkspace | undefined;
	constructor(uri: GitUri, view: WorkspacesView, parent: ViewNode, public readonly workspace: GKWorkspace) {
		super(uri, view, parent);

		this._workspace = workspace;
	}

	override get id(): string {
		return WorkspaceNode.getId(this._workspace?.id ?? '');
	}

	get name(): string {
		return this._workspace?.name ?? '';
	}

	get repositories(): string[] {
		return this._workspace?.repositories ?? [];
	}

	private _children: ViewNode[] | undefined;

	getChildren(): ViewNode[] {
		if (this._children == null) {
			this._children = [];
			for(const repository of this.repositories) {
				this._children.push(new MessageNode(this.view, this, repository, 'Dummy repository', 'Dummy repository', {
					dark: this.view.container.context.asAbsolutePath('images/dark/icon-repo.svg'),
					light: this.view.container.context.asAbsolutePath('images/light/icon-repo.svg'),
				}));
			}
		}

		return this._children;
	}

	getTreeItem(): TreeItem {
		this.splatted = false;

		const description = 'This is a workspace!';
		const tooltip = new MarkdownString('', true);
		const icon: ThemeIcon = new ThemeIcon('cloud');

		const item = new TreeItem(this.name, TreeItemCollapsibleState.Collapsed);
		item.id = this.id;
		item.description = description;
		item.contextValue = '';
		item.iconPath = icon;
		item.tooltip = tooltip;
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
