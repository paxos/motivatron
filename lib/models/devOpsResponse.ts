export interface DevOpsResponse {
  value?: ValueEntity[] | null;
  count: number;
}
export interface ValueEntity {
  repository: Repository;
  pullRequestId: number;
  codeReviewId: number;
  status: string;
  createdBy: CreatedByOrAutoCompleteSetBy;
  creationDate: string;
  closedDate: string;
  title: string;
  description?: string | null;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus: string;
  isDraft: boolean;
  mergeId: string;
  lastMergeSourceCommit: LastMergeSourceCommitOrLastMergeTargetCommitOrLastMergeCommit;
  lastMergeTargetCommit: LastMergeSourceCommitOrLastMergeTargetCommitOrLastMergeCommit;
  lastMergeCommit: LastMergeSourceCommitOrLastMergeTargetCommitOrLastMergeCommit;
  reviewers?: ReviewersEntity[] | null;
  url: string;
  supportsIterations: boolean;
  completionOptions?: CompletionOptions | null;
  autoCompleteSetBy?: CreatedByOrAutoCompleteSetBy1 | null;
}
export interface Repository {
  id: string;
  name: string;
  url: string;
  project: Project;
}
export interface Project {
  id: string;
  name: string;
  state: string;
  visibility: string;
  lastUpdateTime: string;
}
export interface CreatedByOrAutoCompleteSetBy {
  displayName: string;
  url: string;
  _links: Links;
  id: string;
  uniqueName: string;
  imageUrl: string;
  descriptor: string;
}
export interface Links {
  avatar: Avatar;
}
export interface Avatar {
  href: string;
}
export interface LastMergeSourceCommitOrLastMergeTargetCommitOrLastMergeCommit {
  commitId: string;
  url: string;
}
export interface ReviewersEntity {
  reviewerUrl: string;
  vote: number;
  hasDeclined: boolean;
  isFlagged: boolean;
  displayName: string;
  url: string;
  _links: Links;
  id: string;
  uniqueName: string;
  imageUrl: string;
  isContainer?: boolean | null;
  votedFor?: VotedForEntity[] | null;
}
export interface VotedForEntity {
  reviewerUrl: string;
  vote: number;
  displayName: string;
  url: string;
  _links: Links;
  id: string;
  uniqueName: string;
  imageUrl: string;
  isContainer: boolean;
}
export interface CompletionOptions {
  mergeCommitMessage?: string | null;
  deleteSourceBranch?: boolean | null;
  squashMerge?: boolean | null;
  mergeStrategy: string;
  bypassReason?: string | null;
  transitionWorkItems?: boolean | null;
  autoCompleteIgnoreConfigIds?: null[] | null;
}
export interface CreatedByOrAutoCompleteSetBy1 {
  displayName: string;
  url: string;
  _links: Links;
  id: string;
  uniqueName: string;
  imageUrl: string;
  descriptor: string;
}
