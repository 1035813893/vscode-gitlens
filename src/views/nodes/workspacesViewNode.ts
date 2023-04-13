import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import type { GKCloudWorkspace } from '../../plus/workspaces/models';
import type { WorkspacesView } from '../workspacesView';
import { ViewNode } from './viewNode';
import { WorkspaceNode } from './workspaceNode';

export class WorkspacesViewNode extends ViewNode<WorkspacesView> {
	static key = ':workspaces';
	static getId(type: string): string {
		return `gitlens${this.key}(${type})`;
	}

	private _type: string = 'TODO';
	private _children: WorkspaceNode[] | undefined;

	override get id(): string {
		return WorkspacesViewNode.getId(this._type);
	}

	async getChildren(): Promise<ViewNode[]> {
		if (this._children == null) {
			const children: WorkspaceNode[] = [];
			// TODO@ramint Add local workspace nodes (and maybe current workspace)
			const workspaces: GKCloudWorkspace[] = await this.view.container.workspaces.getWorkspaces();
			if (workspaces?.length) {
				workspaces.forEach((cloudWorkspace: GKCloudWorkspace) => {
					children.push(new WorkspaceNode(this.uri, this.view, this, cloudWorkspace));
				});
			}

			this._children = children;
		}

		return this._children;
	}

	getTreeItem(): TreeItem {
		const item = new TreeItem('Workspaces', TreeItemCollapsibleState.Expanded);

		return item;
	}

	override refresh(reset: boolean = false) {
		if (this._children == null) return;

		if (reset) {
			this._children = undefined;
		}

		void this.getChildren();
	}
}
