import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from 'vscode';
import type { Workspace, WorkspaceRepositoryInfo, WorkspacesResponse } from '../../plus/workspaces/models';
import { GKWorkspace } from '../../plus/workspaces/models';
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

	async getChildren(): Promise<ViewNode[]> {
		if (this._children == null) {
			// TODO@ramint use workspaces API instead of hardcoded sample
			const children: WorkspaceNode[] = [];
			const workspaceResponse: WorkspacesResponse | undefined = await this.view.container.workspacesApi.getWorkspacesWithRepos();
			const workspaces = workspaceResponse?.data?.projects?.nodes;
			if (workspaces?.length) {
				workspaces.forEach((workspace: Workspace) => {
					const repositories: WorkspaceRepositoryInfo[] = workspace.provider_data?.repositories?.nodes ?? [];
					children.push(new WorkspaceNode(this.uri, this.view, this, new GKWorkspace(workspace.id, workspace.name, repositories)));
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
