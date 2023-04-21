import { TreeItem, TreeItemCollapsibleState } from 'vscode';
import type { GKLocalWorkspace } from '../../plus/workspaces/models';
import { GKCloudWorkspace } from '../../plus/workspaces/models';
import type { WorkspacesView } from '../workspacesView';
import { ViewNode } from './viewNode';
import { WorkspaceNode } from './workspaceNode';

export class WorkspacesViewNode extends ViewNode<WorkspacesView> {
	static key = ':workspaces';
	static getId(): string {
		return `gitlens${this.key}`;
	}

	private _children: WorkspaceNode[] | undefined;

	override get id(): string {
		return WorkspacesViewNode.getId();
	}

	async getChildren(): Promise<ViewNode[]> {
		if (this._children == null) {
			const children: WorkspaceNode[] = [];

			const workspaces: (GKCloudWorkspace | GKLocalWorkspace)[] =
				await this.view.container.workspaces.getWorkspaces();
			if (workspaces?.length) {
				for (const workspace of workspaces) {
					if (workspace instanceof GKCloudWorkspace && workspace.repositories == null) {
						await workspace.loadRepositories();
					}
					children.push(new WorkspaceNode(this.uri, this.view, this, workspace));
				}
			}

			this._children = children;
		}

		return this._children;
	}

	getTreeItem(): TreeItem {
		const item = new TreeItem('Workspaces', TreeItemCollapsibleState.Expanded);

		return item;
	}

	override refresh() {
		this._children = undefined;
		void this.getChildren();
	}
}
