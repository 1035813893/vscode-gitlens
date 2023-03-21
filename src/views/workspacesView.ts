import type { Disposable, Event } from 'vscode';
import { EventEmitter } from 'vscode';
import type { WorkspacesViewConfig } from '../config';
import type { Container } from '../container';
import { unknownGitUri } from '../git/gitUri';
import { RepositoryFolderNode } from './nodes/viewNode';
import { WorkspacesNode } from './nodes/workspacesNode';
import { ViewBase } from './viewBase';

export class WorkspacesView extends ViewBase<WorkspacesNode, WorkspacesViewConfig> {
	protected readonly configKey = 'workspaces';

	constructor(container: Container) {
		super(container, 'gitlens.views.workspaces', 'Workspaces', 'workspaceView');
	}

	private _onDidChangeAutoRefresh = new EventEmitter<void>();
	get onDidChangeAutoRefresh(): Event<void> {
		return this._onDidChangeAutoRefresh.event;
	}

	override get canSelectMany(): boolean {
		return false;
	}

	protected getRoot() {
		return new WorkspacesNode(unknownGitUri, this);
	}

	override get canReveal(): boolean {
		return false;
	}

	async revealRepository(
		repoPath: string,
		options?: { select?: boolean; focus?: boolean; expand?: boolean | number },
	) {
		const node = await this.findNode(RepositoryFolderNode.getId(repoPath), {
			maxDepth: 1,
			canTraverse: n => n instanceof WorkspacesNode || n instanceof RepositoryFolderNode,
		});

		if (node !== undefined) {
			await this.reveal(node, options);
		}

		return node;
	}


	protected registerCommands(): Disposable[] {
		void this.container.viewCommands;

		return [];
	}
}
