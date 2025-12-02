# Directus MCP Comments Extension

A Directus extension that adds a `comments` tool to the MCP (Model Context Protocol) interface, allowing AI agents to create, read, update, and delete comments on Directus items.

## Features

- **Create** comments on any item in any collection
- **Read** comments with filtering by collection and item
- **Update** existing comments
- **Delete** comments
- Full integration with Directus user system and permissions
- Automatic timestamp tracking

## Prerequisites

This extension requires the `directus-extension-mcp-customization` extension to be installed and enabled.

## Installation

1. Install dependencies:
```bash
npm install
```

2. Build the extension:
```bash
npm run build
```

3. The extension will be automatically loaded by Directus when the server starts.

## Usage

The `comments` tool supports four operations:

### Create a Comment

```json
{
  "action": "create",
  "collection": "posts",
  "item": "abc-123",
  "comment": "This is a great post!"
}
```

### Read Comments

Read all comments for a collection:
```json
{
  "action": "read",
  "collection": "posts",
  "limit": 10
}
```

Read comments for a specific item:
```json
{
  "action": "read",
  "collection": "posts",
  "item": "abc-123",
  "limit": 10
}
```

### Update a Comment

```json
{
  "action": "update",
  "id": "comment-id-123",
  "comment": "Updated comment text"
}
```

### Delete a Comment

```json
{
  "action": "delete",
  "id": "comment-id-123"
}
```

## Technical Details

### Architecture

This extension uses the Directus hook system to:
1. Register the `comments` tool in the MCP tools list via the `mcp.tools.list` filter
2. Handle tool execution via the `comments.mcp.tools.call` filter event
3. Receive user accountability from the `meta` parameter passed by the customization extension
4. Use `CommentsService` with proper accountability for permission-aware operations

### Filter Event Handler

```typescript
emitter.onFilter("comments.mcp.tools.call", async (toolCall, meta) => {
  // Extract accountability from meta parameter
  const { accountability } = meta;

  // Get input arguments from toolCall
  const input = commentInputSchema.parse(toolCall.arguments);

  // Create service with accountability for proper permissions
  const commentsService = new CommentsService({
    schema: await getSchema(),
    accountability,  // Ensures user context and permissions
  });

  // Perform operations with permission enforcement
  // ...
});
```

## Development

Watch mode for development:
```bash
npm run dev
```

Validate the extension:
```bash
npm run validate
```

## License

MIT
