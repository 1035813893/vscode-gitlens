import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import { gate } from '../../system/decorators/gate';
import { debug } from '../../system/decorators/log';
import { GKWorkspace } from '../../workspaces';
import type { WorkspacesView } from '../workspacesView';
import { ContextValues, ViewNode } from './viewNode';
import { WorkspaceNode } from './workspaceNode';

export class WorkspacesNode extends ViewNode<WorkspacesView> {
	static key = ':workspaces';
	static getId(type: string): string {
		return `gitlens${this.key}(${type})`;
	}

	private _type: string = 'TODO';
	private _children: WorkspaceNode[] | undefined;

	override get id(): string {
		return WorkspacesNode.getId(this._type);
	}

	getChildren(): ViewNode[] {
		if (this._children == null) {
			// TODO@ramint use workspaces API instead of hardcoded sample
			this._children = [
				new WorkspaceNode(this.uri, this.view, this, new GKWorkspace(
					'1',
					'GitLens Workspace',
					['vscode-gitlens', 'GitKrakenComponents']
				)),
				new WorkspaceNode(this.uri, this.view, this, new GKWorkspace(
					'2',
					'GK Client Workspace',
					['GitKraken', 'api.gitkraken.com', 'gk-payment']
				)),
			];
		}

		return this._children;
	}

	getTreeItem(): TreeItem {
		const item = new TreeItem(
			'Workspaces',
			TreeItemCollapsibleState.Collapsed,
		);
		item.id = this.id;
		item.contextValue = ContextValues.Worktrees;
		item.description = undefined;
		// TODO@eamodio `folder` icon won't work here for some reason
		item.iconPath = new ThemeIcon('folder-opened');
		return item;
	}

	@gate()
	@debug()
	override refresh() {
		this._children = undefined;
	}
}
