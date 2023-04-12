import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import type { GKCloudWorkspace } from '../../plus/workspaces/models';
import { gate } from '../../system/decorators/gate';
import { debug } from '../../system/decorators/log';
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
			// TODO@ramint Add local workspace nodes (and maybe current workspace)
			const children: WorkspaceNode[] = [];
			const cloudWorkspaces: GKCloudWorkspace[] = this.view.container.workspaces.cloudWorkspaces;
			if (cloudWorkspaces?.length) {
				cloudWorkspaces.forEach((cloudWorkspace: GKCloudWorkspace) => {
					children.push(new WorkspaceNode(this.uri, this.view, this, cloudWorkspace));
				});
			}

			this._children = children;
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
