import { defineHook } from "@directus/extensions-sdk";
import { z } from "zod";
import type { HookExtensionContext } from "@directus/types";

// Input validation schemas using Zod
const createCommentSchema = z.object({
	action: z.literal("create"),
	collection: z.string().describe("The collection the item belongs to"),
	item: z.string().describe("The primary key of the item to comment on"),
	comment: z.string().describe("The comment text"),
});

const readCommentsSchema = z.object({
	action: z.literal("read"),
	collection: z.string().describe("The collection to read comments from"),
	item: z.string().optional().describe("Optional item ID to filter comments"),
	limit: z.number().optional().describe("Maximum number of comments to return"),
});

const updateCommentSchema = z.object({
	action: z.literal("update"),
	id: z.string().describe("The comment ID to update"),
	comment: z.string().describe("The updated comment text"),
});

const deleteCommentSchema = z.object({
	action: z.literal("delete"),
	id: z.string().describe("The comment ID to delete"),
});

const commentInputSchema = z.discriminatedUnion("action", [
	createCommentSchema,
	readCommentsSchema,
	updateCommentSchema,
	deleteCommentSchema,
]);

type CommentInput = z.infer<typeof commentInputSchema>;

export default defineHook((_, context: HookExtensionContext) => {
	const { emitter, services, getSchema } = context;

	// Register the comments tool in the MCP tools list
	emitter.onFilter("mcp.tools.list", (tools) => {
		return [
			...tools,
			{
				name: "comments",
				annotations: {
					title: "Directus - Comments",
				},
				description: `Perform CRUD operations on comments for Directus items.

## Actions

- \`create\`: Add a comment to an item (requires: action, collection, item, comment)
- \`read\`: Retrieve comments for items (requires: action, collection; optional: item, limit)
- \`update\`: Modify an existing comment (requires: action, id, comment)
- \`delete\`: Remove a comment (requires: action, id)

## Examples

### Create Comment
\`\`\`json
{
  "action": "create",
  "collection": "posts",
  "item": "abc-123",
  "comment": "This is a great post!"
}
\`\`\`

### Read Comments
\`\`\`json
{
  "action": "read",
  "collection": "posts",
  "item": "abc-123",
  "limit": 10
}
\`\`\`

### Update Comment
\`\`\`json
{
  "action": "update",
  "id": "comment-id-123",
  "comment": "Updated comment text"
}
\`\`\`

### Delete Comment
\`\`\`json
{
  "action": "delete",
  "id": "comment-id-123"
}
\`\`\`
`,
				inputSchema: {
					type: "object",
					properties: {
						action: {
							type: "string",
							enum: ["create", "read", "update", "delete"],
							description: "The operation to perform: create, read, update, or delete",
						},
						collection: {
							type: "string",
							description: "The collection name (required for create and read actions)",
						},
						item: {
							type: "string",
							description: "The item ID (required for create, optional for read to filter by specific item)",
						},
						comment: {
							type: "string",
							description: "The comment text (required for create and update actions)",
						},
						id: {
							type: "string",
							description: "The comment ID (required for update and delete actions)",
						},
						limit: {
							type: "number",
							description: "Maximum number of comments to return (optional for read action, default: 50)",
						},
					},
					required: ["action"],
				},
			},
		];
	});

	// Handle comments tool execution
	emitter.onFilter("comments.mcp.tools.call", async (toolCall, meta) => {
		try {
			const input = commentInputSchema.parse(toolCall.arguments);
			const schema = await getSchema();
			const { CommentsService } = services;

			const commentsService = new CommentsService({
				schema,
				accountability: meta.accountability,
			});

			switch (input.action) {
				case "create": {
					// Create a new comment
					const result = await commentsService.createOne({
						collection: input.collection,
						item: input.item,
						comment: input.comment,
					});

					// Read back the created comment with user details
					const comment = await commentsService.readOne(result, {
						fields: [
							"id",
							"collection",
							"item",
							"comment",
							"date_created",
							"date_updated",
							"user_created.id",
							"user_created.first_name",
							"user_created.last_name",
							"user_created.email",
						],
					});

					return {
						content: [
							{
								type: "text",
								text: `Comment created successfully with ID: ${result}`,
							},
							{
								type: "text",
								text: JSON.stringify(comment, null, 2),
							},
						],
					};
				}

				case "read": {
					// Build filter for reading comments
					const filter: any = {
						collection: { _eq: input.collection },
					};

					if (input.item) {
						filter.item = { _eq: input.item };
					}

					const comments = await commentsService.readByQuery({
						filter,
						limit: input.limit || 50,
						sort: ["-date_created"],
						fields: [
							"id",
							"collection",
							"item",
							"comment",
							"date_created",
							"date_updated",
							"user_created.id",
							"user_created.first_name",
							"user_created.last_name",
							"user_created.email",
						],
					});

					return {
						content: [
							{
								type: "text",
								text: `Found ${comments.length} comment(s)`,
							},
							{
								type: "text",
								text: JSON.stringify(comments, null, 2),
							},
						],
					};
				}

				case "update": {
					// Update an existing comment
					await commentsService.updateOne(input.id, {
						comment: input.comment,
					});

					// Read back the updated comment
					const updatedComment = await commentsService.readOne(input.id, {
						fields: [
							"id",
							"collection",
							"item",
							"comment",
							"date_created",
							"date_updated",
							"user_created.id",
							"user_created.first_name",
							"user_created.last_name",
							"user_created.email",
						],
					});

					return {
						content: [
							{
								type: "text",
								text: `Comment ${input.id} updated successfully`,
							},
							{
								type: "text",
								text: JSON.stringify(updatedComment, null, 2),
							},
						],
					};
				}

				case "delete": {
					// Delete a comment
					await commentsService.deleteOne(input.id);

					return {
						content: [
							{
								type: "text",
								text: `Comment ${input.id} deleted successfully`,
							},
						],
					};
				}
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			return {
				content: [
					{
						type: "text",
						text: `Error: ${errorMessage}`,
					},
				],
				isError: true,
			};
		}
	});
});
