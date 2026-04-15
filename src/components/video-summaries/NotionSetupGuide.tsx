import { Database } from "lucide-react";

export function NotionSetupGuide() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6">
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <Database className="h-5 w-5" />
        Notion 연동 설정 가이드
      </h3>
      <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
        <li>
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Notion Integrations
          </a>
          에서 새 Integration을 생성합니다.
        </li>
        <li>
          Notion 데이터베이스를 생성하고 다음 속성을 추가합니다:
          <ul className="ml-6 mt-1 space-y-1 list-disc">
            <li>
              <code className="bg-muted px-1 rounded">Name</code> (Title)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">URL</code> (URL)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">Channel</code> (Rich
              Text)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">Date</code> (Date)
            </li>
            <li>
              <code className="bg-muted px-1 rounded">Tags</code> (Multi
              Select)
            </li>
          </ul>
        </li>
        <li>데이터베이스에 Integration을 연결합니다 (Share → Invite).</li>
        <li>
          <code className="bg-muted px-1 rounded">.env.local</code> 파일에
          키를 추가합니다:
          <pre className="mt-1 bg-muted rounded-lg p-3 text-xs overflow-x-auto">
            {`NOTION_API_KEY=ntn_xxxxxxxxxxxxx
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`}
          </pre>
        </li>
      </ol>
    </div>
  );
}
