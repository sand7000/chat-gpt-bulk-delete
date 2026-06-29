const TOKEN = process.env.CHATGPT_TOKEN;

if (!TOKEN) {
  console.error("Missing CHATGPT_TOKEN");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

async function listFiles(cursor = null) {
  const res = await fetch(
    "https://chatgpt.com/backend-api/files/library",
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        limit: 50,
        cursor,
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List failed: ${res.status}\n${text}`);
  }

  return await res.json();
}

function extractItems(data) {
  return (
    data.items ||
    data.files ||
    data.data ||
    data.results ||
    []
  );
}

function extractCursor(data) {
  return (
    data.cursor ||
    data.next_cursor ||
    data.nextCursor ||
    null
  );
}

function extractRealFileId(file) {
  return (
    file.file_id ||
    file.file?.id ||
    file.file?.file_id ||
    file.openai_file_id ||
    file.resource?.file_id ||
    null
  );
}

async function deleteFile(id) {
  const res = await fetch(
    `https://chatgpt.com/backend-api/files/${id}`,
    {
      method: "DELETE",
      headers,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`Failed to delete ${id}: ${res.status}`);
    console.error(text);
    return false;
  }

  console.log(`Deleted ${id}`);
  return true;
}

async function main() {
  let cursor = null;
  let scanned = 0;
  let deleted = 0;

  while (true) {
    const data = await listFiles(cursor);

    const items = extractItems(data);

    console.log(`Found ${items.length} files`);

    if (!Array.isArray(items) || items.length === 0) {
      break;
    }

    for (const file of items) {
      scanned++;

      const realId = extractRealFileId(file);

      if (!realId) {
        console.log("Could not find real file id:");
        console.log(JSON.stringify(file, null, 2));
        continue;
      }

      console.log(`Deleting ${realId}`);

      const ok = await deleteFile(realId);

      if (ok) {
        deleted++;
      }

      await new Promise((r) => setTimeout(r, 300));
    }

    cursor = extractCursor(data);

    if (!cursor) {
      break;
    }
  }

  console.log(`Done.`);
  console.log(`Scanned: ${scanned}`);
  console.log(`Deleted: ${deleted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
