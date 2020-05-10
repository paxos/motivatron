export interface IntercomResponse {
  type: string;
  pages: Pages;
  conversations?: ConversationsEntity[] | null;
}
export interface Pages {
  type: string;
  next?: null;
  page: number;
  per_page: number;
  total_pages: number;
}
export interface ConversationsEntity {
  type: string;
  id: string;
  created_at: number;
  updated_at: number;
  waiting_since: number;
  snoozed_until: number;
  assignee: AuthorOrCustomersEntityOrAssigneeOrUser;
  open: boolean;
  state: string;
  read: boolean;
  conversation_message: ConversationMessage;
  customers?: AuthorOrCustomersEntityOrAssigneeOrUser[] | null;
  user: AuthorOrCustomersEntityOrAssigneeOrUser;
}
export interface AuthorOrCustomersEntityOrAssigneeOrUser {
  type: string;
  id: string;
}
export interface ConversationMessage {
  type: string;
  id: string;
  subject: string;
  body: string;
  author: AuthorOrCustomersEntityOrAssigneeOrUser;
  attachments?: null[] | null;
  url?: null;
}
