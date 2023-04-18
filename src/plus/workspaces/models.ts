export enum WorkspaceType {
	Local = 'local',
	Cloud = 'cloud',
}

// Cloud Workspace types
export class GKCloudWorkspace {
	private readonly _type: WorkspaceType = WorkspaceType.Cloud;
	private readonly _id: string;
	private readonly _name: string;
	private readonly _repositories: CloudWorkspaceRepositoryDescriptor[] | undefined;
	constructor(id: string, name: string, repositories?: CloudWorkspaceRepositoryDescriptor[]) {
		this._id = id;
		this._name = name;
		this._repositories = repositories;
	}

	get type(): WorkspaceType {
		return this._type;
	}

	get id(): string {
		return this._id;
	}

	get name(): string {
		return this._name;
	}

	get repositories(): CloudWorkspaceRepositoryDescriptor[] | undefined {
		return this._repositories;
	}

	getRepository(name: string): CloudWorkspaceRepositoryDescriptor | undefined {
		return this._repositories?.find(r => r.name === name);
	}
}

export interface CloudWorkspaceRepositoryDescriptor {
	id: string;
	name: string;
	description: string;
	repository_id: string;
	provider: string;
	provider_organization_name: string;
	url: string;
}

export type CloudWorkspaceProvider =
	| 'GITHUB'
	| 'GITHUB_ENTERPRISE'
	| 'GITLAB'
	| 'GITLAB_SELF_HOSTED'
	| 'BITBUCKET'
	| 'AZURE';

export interface CloudWorkspaceData {
	id: string;
	name: string;
	description: string;
	type: CloudWorkspaceType;
	icon_url: string;
	host_url: string;
	status: string;
	provider: string;
	azure_organization_id: string;
	azure_project: string;
	created_date: Date;
	updated_date: Date;
	created_by: string;
	updated_by: string;
	members: CloudWorkspaceMember[];
	organization: CloudWorkspaceOrganization;
	issue_tracker: CloudWorkspaceIssueTracker;
	settings: CloudWorkspaceSettings;
	current_user: UserCloudWorkspaceSettings;
	errors: string[];
	provider_data: ProviderCloudWorkspaceData;
}

export type CloudWorkspaceType = 'GK_PROJECT' | 'GK_ORG_VELOCITY' | 'GK_CLI';

export interface CloudWorkspaceMember {
	id: string;
	role: string;
	name: string;
	username: string;
	avatar_url: string;
}

interface CloudWorkspaceOrganization {
	id: string;
	team_ids: string[];
}

interface CloudWorkspaceIssueTracker {
	provider: string;
	settings: CloudWorkspaceIssueTrackerSettings;
}

interface CloudWorkspaceIssueTrackerSettings {
	resource_id: string;
}

interface CloudWorkspaceSettings {
	gkOrgVelocity: GKOrgVelocitySettings;
	goals: ProjectGoalsSettings;
}

type GKOrgVelocitySettings = Record<string, unknown>;
type ProjectGoalsSettings = Record<string, unknown>;

interface UserCloudWorkspaceSettings {
	project_id: string;
	user_id: string;
	tab_settings: UserCloudWorkspaceTabSettings;
}

interface UserCloudWorkspaceTabSettings {
	issue_tracker: CloudWorkspaceIssueTracker;
}

export interface ProviderCloudWorkspaceData {
	id: string;
	provider_organization_id: string;
	repository: CloudWorkspaceRepositoryData;
	repositories: CloudWorkspaceConnection<CloudWorkspaceRepositoryData>;
	pull_requests: CloudWorkspacePullRequestData[];
	issues: CloudWorkspaceIssue[];
	repository_members: CloudWorkspaceRepositoryMemberData[];
	milestones: CloudWorkspaceMilestone[];
	labels: CloudWorkspaceLabel[];
	issue_types: CloudWorkspaceIssueType[];
	provider_identity: ProviderCloudWorkspaceIdentity;
	metrics: ProviderCloudWorkspaceMetrics;
}

type ProviderCloudWorkspaceMetrics = Record<string, unknown>;

interface ProviderCloudWorkspaceIdentity {
	avatar_url: string;
	id: string;
	name: string;
	username: string;
	pat_organization: string;
	is_using_pat: boolean;
	scopes: string;
}

export interface Branch {
	id: string;
	node_id: string;
	name: string;
	commit: BranchCommit;
}

interface BranchCommit {
	id: string;
	url: string;
	build_status: {
		context: string;
		state: string;
		description: string;
	};
}

export interface CloudWorkspaceRepositoryData {
	id: string;
	name: string;
	description: string;
	repository_id: string;
	provider: string;
	provider_organization_id: string;
	provider_organization_name: string;
	url: string;
	default_branch: string;
	branches: Branch[];
	pull_requests: CloudWorkspacePullRequestData[];
	issues: CloudWorkspaceIssue[];
	members: CloudWorkspaceRepositoryMemberData[];
	milestones: CloudWorkspaceMilestone[];
	labels: CloudWorkspaceLabel[];
	issue_types: CloudWorkspaceIssueType[];
	possibly_deleted: boolean;
	has_webhook: boolean;
}

interface CloudWorkspaceRepositoryMemberData {
	avatar_url: string;
	name: string;
	node_id: string;
	username: string;
}

type CloudWorkspaceMilestone = Record<string, unknown>;
type CloudWorkspaceLabel = Record<string, unknown>;
type CloudWorkspaceIssueType = Record<string, unknown>;

export interface CloudWorkspacePullRequestData {
	id: string;
	node_id: string;
	number: string;
	title: string;
	description: string;
	url: string;
	milestone_id: string;
	labels: CloudWorkspaceLabel[];
	author_id: string;
	author_username: string;
	created_date: Date;
	updated_date: Date;
	closed_date: Date;
	merged_date: Date;
	first_commit_date: Date;
	first_response_date: Date;
	comment_count: number;
	repository: CloudWorkspaceRepositoryData;
	head_commit: {
		id: string;
		url: string;
		build_status: {
			context: string;
			state: string;
			description: string;
		};
	};
	lifecycle_stages: {
		stage: string;
		start_date: Date;
		end_date: Date;
	}[];
	reviews: CloudWorkspacePullRequestReviews[];
	head: {
		name: string;
	};
}

interface CloudWorkspacePullRequestReviews {
	user_id: string;
	avatar_url: string;
	state: string;
}

export interface CloudWorkspaceIssue {
	id: string;
	node_id: string;
	title: string;
	author_id: string;
	assignee_ids: string[];
	milestone_id: string;
	label_ids: string[];
	issue_type: string;
	url: string;
	created_date: Date;
	updated_date: Date;
	comment_count: number;
	repository: CloudWorkspaceRepositoryData;
}

interface CloudWorkspaceConnection<i> {
	total_count: number;
	page_info: {
		start_cursor: string;
		end_cursor: string;
		has_next_page: boolean;
	};
	nodes: i[];
}

interface CloudWorkspaceFetchedConnection<i> extends CloudWorkspaceConnection<i> {
	is_fetching: boolean;
}

export interface WorkspacesResponse {
	data: {
		projects: CloudWorkspaceConnection<CloudWorkspaceData>;
	};
}

export interface WorkspacePullRequestsResponse {
	data: {
		project: {
			provider_data: {
				pull_requests: CloudWorkspaceFetchedConnection<CloudWorkspacePullRequestData>;
			};
		};
	};
}

export interface WorkspacesWithPullRequestsResponse {
	data: {
		projects: {
			nodes: {
				provider_data: {
					pull_requests: CloudWorkspaceFetchedConnection<CloudWorkspacePullRequestData>;
				};
			}[];
		};
	};
	errors?: {
		message: string;
		path: unknown[];
		statusCode: number;
	}[];
}

export interface WorkspaceIssuesResponse {
	data: {
		project: {
			provider_data: {
				issues: CloudWorkspaceFetchedConnection<CloudWorkspaceIssue>;
			};
		};
	};
}

// Local Workspace Types
export class GKLocalWorkspace {
	private readonly _type: WorkspaceType = WorkspaceType.Local;
	private readonly _id: string;
	private readonly _name: string;
	private readonly _repositories: LocalWorkspaceRepositoryDescriptor[] | undefined;
	constructor(id: string, name: string, repositories?: LocalWorkspaceRepositoryDescriptor[]) {
		this._id = id;
		this._name = name;
		this._repositories = repositories;
	}

	get type(): WorkspaceType {
		return this._type;
	}

	get id(): string {
		return this._id;
	}

	get name(): string {
		return this._name;
	}

	get repositories(): LocalWorkspaceRepositoryDescriptor[] | undefined {
		return this._repositories;
	}

	getRepository(name: string): LocalWorkspaceRepositoryDescriptor | undefined {
		return this._repositories?.find(r => r.name === name);
	}
}

// Local workspace file constants

export const localWorkspaceDataFilePath = 'localWorkspaces.json';
export const localWorkspaceDataLegacyFilePath = 'workspaces/workspaces.json';

export interface LocalWorkspaceFileData {
	workspaces: LocalWorkspaceData;
}

export type LocalWorkspaceData = {
	[localWorkspaceId: string]: LocalWorkspaceDescriptor;
};

export interface LocalWorkspaceDescriptor {
	localId: string;
	profileId: string;
	name: string;
	description: string;
	repositories: LocalWorkspaceRepositoryPath[];
	version: number;
}

export interface LocalWorkspaceRepositoryPath {
	localPath: string;
}

export interface LocalWorkspaceRepositoryDescriptor extends LocalWorkspaceRepositoryPath {
	name: string;
}

// Cloud workspace file constants

export const cloudWorkspaceDataFilePath = 'cloudWorkspaces.json';

export interface CloudWorkspaceFileData {
	workspaces: CloudWorkspacesPathMap;
}

export type CloudWorkspacesPathMap = {
	[cloudWorkspaceId: string]: CloudWorkspaceRepoPaths;
};

export interface CloudWorkspaceRepoPaths {
	repoPaths: CloudWorkspaceRepoPathMap;
}

export type CloudWorkspaceRepoPathMap = {
	[repoId: string]: string;
};
