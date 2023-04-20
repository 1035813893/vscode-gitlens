import type { Disposable } from 'vscode';
import type { WorkspacesViewConfig } from '../config';
import type { Container } from '../container';
import { unknownGitUri } from '../git/gitUri';
import { GKCloudWorkspace } from '../plus/workspaces/models';
import { RepositoryNode } from './nodes/repositoryNode';
import type { WorkspaceMissingRepositoryNode } from './nodes/workspaceMissingRepositoryNode';
import { WorkspaceNode } from './nodes/workspaceNode';
import { WorkspacesViewNode } from './nodes/workspacesViewNode';
import { ViewBase } from './viewBase';
import { registerViewCommand } from './viewCommands';

export class WorkspacesView extends ViewBase<WorkspacesViewNode, WorkspacesViewConfig> {
	protected readonly configKey = 'repositories';

	constructor(container: Container) {
		super(container, 'gitlens.views.workspaces', 'Workspaces', 'workspaceView');
	}

	override get canSelectMany(): boolean {
		return false;
	}

	protected getRoot() {
		return new WorkspacesViewNode(unknownGitUri, this);
	}

	override get canReveal(): boolean {
		return false;
	}

	protected registerCommands(): Disposable[] {
		void this.container.viewCommands;

		return [
			registerViewCommand(
				this.getQualifiedCommand('refresh'),
				() => {
					return this.refresh(true);
				},
				this,
			),
			registerViewCommand(
				this.getQualifiedCommand('create'),
				async () => {
					await this.container.workspaces.createCloudWorkspace();
					void this.ensureRoot().triggerChange(true);
				},
				this,
			),
			registerViewCommand(
				this.getQualifiedCommand('delete'),
				async (node: WorkspaceNode) => {
					await this.container.workspaces.deleteCloudWorkspace(node.workspaceId);
					void node.getParent()?.triggerChange(true);
				},
				this,
			),
			registerViewCommand(
				this.getQualifiedCommand('locateRepo'),
				async (node: RepositoryNode | WorkspaceMissingRepositoryNode) => {
					const repoName = node instanceof RepositoryNode ? node.repo.name : node.name;
					const workspaceNode = node.getParent();
					if (workspaceNode == null || !(workspaceNode instanceof WorkspaceNode)) {
						return;
					}

					await this.container.workspaces.locateWorkspaceRepo(repoName, workspaceNode.workspaceId);

					void workspaceNode.triggerChange(true);
				},
				this,
			),
			registerViewCommand(this.getQualifiedCommand('addRepo'), async (node: WorkspaceNode) => {
				await this.container.workspaces.addCloudWorkspaceRepo(node.workspaceId);
				void node.getParent()?.triggerChange(true);
			}),
			registerViewCommand(
				this.getQualifiedCommand('removeRepo'),
				async (node: RepositoryNode | WorkspaceMissingRepositoryNode) => {
					const repoName = node instanceof RepositoryNode ? node.repo.name : node.name;
					const workspaceNode = node.getParent();
					if (!(workspaceNode instanceof WorkspaceNode)) {
						return;
					}

					const workspace = workspaceNode.workspace;
					if (!(workspace instanceof GKCloudWorkspace)) {
						return;
					}

					await this.container.workspaces.removeCloudWorkspaceRepo(workspace.id, repoName);
					void workspaceNode.getParent()?.triggerChange(true);
				},
			),
		];
	}
}
