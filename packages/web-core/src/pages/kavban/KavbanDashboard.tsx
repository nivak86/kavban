import { useEffect, useMemo, useState, type ComponentType } from 'react';
import type { IconProps } from '@phosphor-icons/react';
import {
  ArchiveIcon,
  BracketsCurlyIcon,
  CaretDownIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CircleIcon,
  ClockIcon,
  CompassIcon,
  DotsThreeIcon,
  FileTextIcon,
  FunnelSimpleIcon,
  GearIcon,
  GithubLogoIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  HouseIcon,
  KanbanIcon,
  LightningIcon,
  ListChecksIcon,
  MagicWandIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlugsConnectedIcon,
  PlusIcon,
  RobotIcon,
  RocketIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  TerminalIcon,
  TrashIcon,
  TrayIcon,
  UserCircleIcon,
  UserIcon,
  XIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import {
  kavbanAgents,
  kavbanConnectorOrder,
  kavbanDefaultAgentRouting,
  kavbanWorkflowColumns,
  useKavbanLocalStore,
} from './model';
import type {
  KavbanAgent as Agent,
  KavbanAgentRoutingInput,
  KavbanAddTaskCommentInput,
  KavbanConnector as Connector,
  KavbanConnectorId as ConnectorId,
  KavbanContextFileInput,
  KavbanCreateTaskInput,
  KavbanAgentId,
  KavbanInboxKind,
  KavbanInboxItem as InboxItem,
  KavbanProfile as Profile,
  KavbanProject as Project,
  KavbanRecordRunCheckInput,
  KavbanRecordHumanReviewInput,
  KavbanRepositoryInput,
  KavbanTag as Tag,
  KavbanTask as Task,
  KavbanTaskPriority,
  KavbanTaskStatus as TaskStatus,
  KavbanUpdateTaskInput,
  KavbanWorkflowIconKey,
} from './model';

type PhosphorIcon = ComponentType<IconProps>;

type AppSection = 'inbox' | 'workspace' | 'settings' | 'profile';
type ProjectTab = 'home' | 'tasks' | 'settings';
type TaskView = 'board' | 'list';

const workflowIconByKey: Record<KavbanWorkflowIconKey, PhosphorIcon> = {
  tray: TrayIcon,
  lightning: LightningIcon,
  circle: CircleIcon,
  'magic-wand': MagicWandIcon,
  'shield-check': ShieldCheckIcon,
  'check-circle': CheckCircleIcon,
};

const connectorIconById: Record<ConnectorId, PhosphorIcon> = {
  github: GithubLogoIcon,
  codex: BracketsCurlyIcon,
  claude: RobotIcon,
};

const inboxIconByKind: Record<KavbanInboxKind, PhosphorIcon> = {
  codex: BracketsCurlyIcon,
  claude: RobotIcon,
  approval: ShieldCheckIcon,
  github: GithubLogoIcon,
};

const workflowColumns = kavbanWorkflowColumns;
const agentOptions: KavbanAgentId[] = ['codex', 'claude'];
const reviewerOptions: KavbanAgentId[] = ['reviewer', 'codex'];
const taskPriorities: KavbanTaskPriority[] = ['High', 'Medium', 'Low'];
const taskAdvanceActions: Partial<
  Record<TaskStatus, { label: string; status: TaskStatus }>
> = {
  backlog: { label: 'Mark ready', status: 'ready' },
  ready: { label: 'Start agent', status: 'progress' },
  progress: { label: 'Send to AI review', status: 'ai-review' },
  'ai-review': { label: 'Request human review', status: 'human-review' },
  'human-review': { label: 'Mark done', status: 'done' },
};
const taskFormFieldClass =
  'w-full rounded-[6px] border border-[#2a2c31] bg-[#111214] px-3 text-sm text-[#dce0e8] outline-none transition-colors placeholder:text-[#626874] focus:border-[#444956]';
const getProfileFirstName = (profile: Profile) =>
  profile.displayName.split(' ')[0] || profile.displayName;

const getTaskAgent = (task: Task) => kavbanAgents[task.agentId];
const getTaskReviewer = (task: Task) => kavbanAgents[task.reviewerId];
const getTaskActivity = (task: Task) =>
  task.events.map((event) => event.summary);
const getDependencyItems = (task: Task, projectTasks: Task[]) =>
  task.dependencies.map((dependency) => ({
    key: dependency,
    task: projectTasks.find(
      (projectTask) =>
        projectTask.id === dependency || projectTask.key === dependency
    ),
  }));
const getBlockingDependencies = (task: Task, projectTasks: Task[]) =>
  getDependencyItems(task, projectTasks).filter(
    (item) => !item.task || item.task.status !== 'done'
  );

function StatusIcon({ task }: { task: Task }) {
  const column = workflowColumns.find((item) => item.id === task.status);
  const Icon = column ? workflowIconByKey[column.iconKey] : CircleIcon;

  return (
    <Icon
      className="size-4 shrink-0"
      style={{ color: column?.color ?? '#7b818d' }}
      weight={task.status === 'done' ? 'fill' : 'bold'}
    />
  );
}

function AgentAvatar({ agent }: { agent: Agent }) {
  return (
    <div
      className="flex size-5 items-center justify-center rounded-full border border-[#1f2024] text-[8px] font-semibold text-[#111216]"
      style={{ backgroundColor: agent.color }}
      title={agent.name}
    >
      {agent.initials}
    </div>
  );
}

function TagPill({ tag }: { tag: Tag }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[5px] border border-[#2a2c31] bg-[#25272b] px-2 text-xs font-medium text-[#cfd2da]">
      <span
        className="size-1.5 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.label}
    </span>
  );
}

function BranchPill({ value }: { value: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[5px] border border-[#2a2c31] bg-[#25272b] px-2 text-xs font-medium text-[#cfd2da]">
      <GitBranchIcon className="size-3.5 text-[#58b957]" weight="bold" />
      {value}
    </span>
  );
}

function PrPill({ value }: { value: string }) {
  return (
    <span className="inline-flex h-6 shrink-0 items-center gap-1.5 rounded-[5px] border border-[#2a2c31] bg-[#25272b] px-2 text-xs font-medium text-[#cfd2da]">
      <GitPullRequestIcon className="size-3.5 text-[#58b957]" weight="bold" />
      {value}
    </span>
  );
}

function HumanReviewPill() {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[5px] border border-[#3b334f] bg-[#1f1b2a] px-2 text-xs font-medium text-[#d6cdfd]">
      <ShieldCheckIcon className="size-3.5" weight="bold" />
      Human
    </span>
  );
}

function TestStatusPill({ status }: { status: Task['testStatus'] }) {
  if (!status || status === 'not-run') {
    return null;
  }

  const passed = status === 'passed';

  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-[5px] border px-2 text-xs font-medium',
        passed
          ? 'border-[#31553a] bg-[#172219] text-[#78d16d]'
          : 'border-[#553131] bg-[#25191b] text-[#f26d6d]'
      )}
    >
      {passed ? (
        <CheckCircleIcon className="size-3.5" weight="fill" />
      ) : (
        <XIcon className="size-3.5" weight="bold" />
      )}
      Tests {status}
    </span>
  );
}

function ReviewStatusPill({ status }: { status: Task['reviewStatus'] }) {
  if (!status) {
    return null;
  }

  const styles = {
    passed: 'border-[#31553a] bg-[#172219] text-[#78d16d]',
    'needs-human': 'border-[#3b334f] bg-[#1f1b2a] text-[#d6cdfd]',
    'changes-requested': 'border-[#553131] bg-[#25191b] text-[#f26d6d]',
  } satisfies Record<NonNullable<Task['reviewStatus']>, string>;
  const labels = {
    passed: 'Review passed',
    'needs-human': 'Needs human',
    'changes-requested': 'Changes requested',
  } satisfies Record<NonNullable<Task['reviewStatus']>, string>;

  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1.5 rounded-[5px] border px-2 text-xs font-medium',
        styles[status]
      )}
    >
      <ShieldCheckIcon className="size-3.5" weight="bold" />
      {labels[status]}
    </span>
  );
}

function ReviewReportCard({
  report,
}: {
  report: NonNullable<Task['reviewReports']>[number];
}) {
  const reviewer = kavbanAgents[report.reviewerId];

  return (
    <div className="rounded-[7px] border border-[#24262b] bg-[#17181b] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AgentAvatar agent={reviewer} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#dce0e8]">
              {reviewer.name}
            </p>
            <p className="font-ibm-plex-mono text-[11px] uppercase text-[#6f7682]">
              {report.status}
            </p>
          </div>
        </div>
        <span className="shrink-0 font-ibm-plex-mono text-[11px] uppercase text-[#777d88]">
          {report.risk} risk
        </span>
      </div>
      <p className="text-sm leading-6 text-[#aeb3bd]">{report.summary}</p>
      <div className="mt-3 space-y-2">
        {report.checks.map((check) => (
          <div key={check} className="flex gap-2 text-xs text-[#8d939f]">
            <CheckCircleIcon
              className="mt-0.5 size-3.5 shrink-0 text-[#78d16d]"
              weight="fill"
            />
            <span>{check}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentRunCard({
  onRecordCheck,
  run,
}: {
  onRecordCheck: (runId: string, input: KavbanRecordRunCheckInput) => boolean;
  run: NonNullable<Task['agentRuns']>[number];
}) {
  const agent = kavbanAgents[run.agentId];
  const checks = run.checks ?? [];

  return (
    <div className="rounded-[7px] border border-[#24262b] bg-[#17181b] p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <AgentAvatar agent={agent} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[#dce0e8]">
              {agent.name}
            </p>
            <p className="font-ibm-plex-mono text-[11px] uppercase text-[#6f7682]">
              {run.status}
            </p>
          </div>
        </div>
        <span className="shrink-0 font-ibm-plex-mono text-[11px] text-[#777d88]">
          {new Date(run.createdAt).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
      <div className="mb-2 flex min-w-0 items-center gap-2 rounded-[6px] border border-[#2a2c31] bg-[#111214] px-2.5 py-2 text-xs text-[#aeb3bd]">
        <GitBranchIcon
          className="size-3.5 shrink-0 text-[#58b957]"
          weight="bold"
        />
        <span className="truncate font-ibm-plex-mono">{run.branch}</span>
      </div>
      <div className="mb-3 flex items-center gap-2 text-xs text-[#858b96]">
        <FileTextIcon className="size-3.5" weight="bold" />
        {run.contextFiles.length} context files attached
      </div>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() =>
            onRecordCheck(run.id, {
              status: 'passed',
              command: 'pnpm test',
              output: 'pnpm test passed from the Kavban run panel.',
            })
          }
          className="flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-[#31553a] bg-[#172219] px-2 text-[11px] font-semibold text-[#78d16d] transition-colors hover:border-[#427049]"
        >
          <CheckCircleIcon className="size-3.5" weight="fill" />
          Pass checks
        </button>
        <button
          type="button"
          onClick={() =>
            onRecordCheck(run.id, {
              status: 'failed',
              command: 'pnpm test',
              output: 'pnpm test failed from the Kavban run panel.',
            })
          }
          className="flex h-8 items-center justify-center gap-1.5 rounded-[6px] border border-[#553131] bg-[#211719] px-2 text-[11px] font-semibold text-[#f26d6d] transition-colors hover:border-[#6b3b3b]"
        >
          <XIcon className="size-3.5" weight="bold" />
          Fail checks
        </button>
      </div>
      {checks.length > 0 && (
        <div className="mb-3 space-y-2">
          {checks.map((check) => (
            <div
              key={check.id}
              className="rounded-[6px] border border-[#24262b] bg-[#111214] px-2.5 py-2 text-xs text-[#aeb3bd]"
            >
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="font-ibm-plex-mono">{check.command}</span>
                <span
                  className={cn(
                    'font-ibm-plex-mono uppercase',
                    check.status === 'passed'
                      ? 'text-[#78d16d]'
                      : 'text-[#f26d6d]'
                  )}
                >
                  {check.status}
                </span>
              </div>
              <p className="truncate text-[#777d88]">{check.output}</p>
            </div>
          ))}
        </div>
      )}
      <pre className="max-h-28 overflow-hidden whitespace-pre-wrap rounded-[6px] border border-[#24262b] bg-[#101113] p-3 font-ibm-plex-mono text-[11px] leading-5 text-[#8d939f]">
        {run.prompt}
      </pre>
    </div>
  );
}

function BlockedPill({ count }: { count: number }) {
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[5px] border border-[#553131] bg-[#25191b] px-2 text-xs font-medium text-[#f26d6d]">
      <ShieldCheckIcon className="size-3.5" weight="bold" />
      Blocked {count}
    </span>
  );
}

function IconButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: PhosphorIcon;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-[7px] text-[#777d88] transition-colors hover:bg-[#202227] hover:text-[#d4d8e0]"
      aria-label={label}
      title={label}
    >
      <Icon className="size-5" weight="bold" />
    </button>
  );
}

function Sidebar({
  activeSection,
  onSectionChange,
  profile,
}: {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  profile: Profile;
}) {
  const topItems: { id: AppSection; label: string; icon: PhosphorIcon }[] = [
    { id: 'inbox', label: 'Inbox', icon: ArchiveIcon },
    { id: 'workspace', label: 'Workspace', icon: KanbanIcon },
    { id: 'settings', label: 'Settings', icon: GearIcon },
  ];

  return (
    <aside className="hidden w-[260px] shrink-0 border-r border-[#24262b] bg-[#111214] px-5 py-6 lg:flex lg:flex-col">
      <div className="mb-8 flex items-center">
        <button
          type="button"
          className="flex min-w-0 items-center gap-3 text-left"
          onClick={() => onSectionChange('workspace')}
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-[#d9dde6] text-[#101113]">
            <KanbanIcon className="size-4" weight="fill" />
          </span>
          <span className="truncate text-base font-semibold text-[#dce0e8]">
            Kavban
          </span>
          <CaretDownIcon className="size-4 text-[#727884]" weight="bold" />
        </button>
      </div>

      <nav className="space-y-1">
        {topItems.map((item) => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={cn(
                'flex h-10 w-full items-center gap-3 rounded-[7px] px-3 text-left text-sm font-medium transition-colors',
                activeSection === item.id
                  ? 'bg-[#1f2126] text-[#dce0e8]'
                  : 'text-[#9ba0aa] hover:bg-[#191b1f] hover:text-[#cfd2dc]'
              )}
            >
              <Icon className="size-5 shrink-0" weight="bold" />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-[#24262b] pt-4">
        <button
          type="button"
          onClick={() => onSectionChange('profile')}
          className={cn(
            'flex h-11 w-full items-center gap-3 rounded-[7px] px-3 text-left text-sm font-medium transition-colors',
            activeSection === 'profile'
              ? 'bg-[#1f2126] text-[#dce0e8]'
              : 'text-[#9ba0aa] hover:bg-[#191b1f] hover:text-[#cfd2dc]'
          )}
        >
          <span className="flex size-6 items-center justify-center rounded-full border border-[#353841] bg-[#202227]">
            <UserIcon className="size-4" weight="bold" />
          </span>
          {getProfileFirstName(profile)}
        </button>
      </div>
    </aside>
  );
}

function TopBar({
  title,
  eyebrow,
  rightSlot,
}: {
  title: string;
  eyebrow?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <header className="flex min-h-[72px] flex-col gap-3 border-b border-[#24262b] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-0">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-xs font-medium text-[#6f7682]">{eyebrow}</p>
        )}
        <h1 className="truncate text-base font-semibold text-[#dce0e8]">
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {rightSlot ?? (
          <>
            <IconButton label="Search" icon={MagnifyingGlassIcon} />
            <IconButton label="Filter" icon={FunnelSimpleIcon} />
            <IconButton label="Display" icon={SlidersHorizontalIcon} />
          </>
        )}
      </div>
    </header>
  );
}

function InboxView({
  inboxItems,
  selectedInboxId,
  onSelectInbox,
  tasks,
}: {
  inboxItems: InboxItem[];
  selectedInboxId: string;
  onSelectInbox: (id: string) => void;
  tasks: Task[];
}) {
  const selected = inboxItems.find((item) => item.id === selectedInboxId);
  const task = tasks.find((item) => item.key === selected?.taskKey);

  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(320px,38%)_1fr]">
      <section className="min-w-0 border-r border-[#24262b] bg-[#101113]">
        <TopBar
          title="Inbox"
          rightSlot={
            <>
              <IconButton label="Filter inbox" icon={FunnelSimpleIcon} />
              <IconButton label="Inbox options" icon={DotsThreeIcon} />
            </>
          }
        />
        <div className="space-y-1 p-3">
          {inboxItems.map((item) => {
            const Icon = inboxIconByKind[item.kind];

            return (
              <button
                type="button"
                key={item.id}
                onClick={() => onSelectInbox(item.id)}
                className={cn(
                  'grid w-full grid-cols-[40px_1fr_auto] items-center gap-3 rounded-[8px] px-3 py-3 text-left transition-colors',
                  selectedInboxId === item.id
                    ? 'bg-[#1f2126]'
                    : 'hover:bg-[#191b1f]'
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-full border border-[#2d3036] bg-[#181a1e] text-[#bfc3cd]">
                  <Icon className="size-5" weight="bold" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-[#d8dbe3]">
                    {item.title}
                  </span>
                  <span className="block truncate text-sm text-[#858b96]">
                    {item.source}
                  </span>
                </span>
                <span className="text-sm text-[#777d88]">{item.time}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="min-w-0 overflow-y-auto bg-[#101113]">
        <TopBar
          title={selected?.title ?? 'Inbox item'}
          eyebrow="Inbox detail"
        />
        <div className="mx-auto max-w-4xl px-8 py-10">
          <div className="mb-10">
            <div className="mb-4 flex items-center gap-3">
              {task && <StatusIcon task={task} />}
              <span className="font-ibm-plex-mono text-sm text-[#777d88]">
                {selected?.taskKey}
              </span>
              <span className="rounded-full border border-[#2a2c31] px-2 py-1 text-xs font-medium text-[#9ca1ad]">
                {selected?.status}
              </span>
            </div>
            <h2 className="text-2xl font-semibold text-[#dce0e8]">
              {task?.title ?? selected?.title}
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[#8d939f]">
              {task?.description ??
                'A project notification is ready for triage.'}
            </p>
          </div>

          <div className="mb-10 rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
            <div className="mb-5 flex items-center gap-3">
              <SparkleIcon className="size-5 text-[#bfc3cd]" weight="bold" />
              <h3 className="text-base font-semibold text-[#dce0e8]">
                Triage Intelligence
              </h3>
            </div>
            <div className="grid gap-4 text-sm sm:grid-cols-[150px_1fr]">
              <span className="font-medium text-[#777d88]">Suggestions</span>
              <div className="flex flex-wrap items-center gap-2">
                {task?.tags.map((tag) => (
                  <TagPill key={tag.label} tag={tag} />
                ))}
                {task && <AgentAvatar agent={getTaskAgent(task)} />}
              </div>
              <span className="font-medium text-[#777d88]">Duplicate</span>
              <span className="text-[#aeb3bd]">
                KAV-121 Intake payload shape
              </span>
              <span className="font-medium text-[#777d88]">Related</span>
              <span className="text-[#aeb3bd]">
                KAV-124 Review diff before human approval
              </span>
            </div>
          </div>

          <div className="mb-10">
            <h3 className="mb-6 text-lg font-semibold text-[#dce0e8]">
              Activity
            </h3>
            <div className="space-y-5">
              {(task ? getTaskActivity(task) : ['Notification opened.']).map(
                (entry) => (
                  <div key={entry} className="flex gap-3">
                    <span className="mt-1 flex size-5 items-center justify-center rounded-full border border-[#353841] bg-[#202227]">
                      <ClockIcon className="size-3.5 text-[#858b96]" />
                    </span>
                    <p className="text-sm text-[#8d939f]">{entry}</p>
                  </div>
                )
              )}
            </div>
          </div>

          <div className="rounded-[8px] border border-[#24262b] bg-[#15161a] p-4">
            <label className="sr-only" htmlFor="inbox-command">
              Tell Kavban what to do next
            </label>
            <textarea
              id="inbox-command"
              className="h-24 w-full resize-none bg-transparent text-sm text-[#dce0e8] outline-none placeholder:text-[#626874]"
              placeholder="Tell Kavban what to do next..."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectTabs({
  activeTab,
  onTabChange,
}: {
  activeTab: ProjectTab;
  onTabChange: (tab: ProjectTab) => void;
}) {
  const tabs: { id: ProjectTab; label: string; icon: PhosphorIcon }[] = [
    { id: 'home', label: 'Home', icon: HouseIcon },
    { id: 'tasks', label: 'Tasks', icon: ListChecksIcon },
    { id: 'settings', label: 'Settings', icon: GearIcon },
  ];

  return (
    <div className="flex items-center gap-1 rounded-[8px] bg-[#191b1f] p-1">
      {tabs.map((tab) => {
        const Icon = tab.icon;

        return (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex h-8 items-center gap-2 rounded-[6px] px-3 text-xs font-semibold transition-colors',
              activeTab === tab.id
                ? 'bg-[#25272d] text-[#dce0e8]'
                : 'text-[#777d88] hover:text-[#cfd2dc]'
            )}
          >
            <Icon className="size-4" weight="bold" />
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

function WorkspaceHome({
  activeProjectId,
  connectors,
  onCreateProject,
  onSelectProject,
  onTabChange,
  project,
  projects,
}: {
  activeProjectId: string;
  connectors: Record<ConnectorId, Connector>;
  onCreateProject: (name: string) => void;
  onSelectProject: (id: string) => void;
  onTabChange: (tab: ProjectTab) => void;
  project: Project;
  projects: Project[];
}) {
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const countTasks = (statuses: TaskStatus[]) =>
    project.tasks.filter((task) => statuses.includes(task.status)).length;

  const stats = [
    {
      label: 'Ready',
      value: String(countTasks(['ready'])),
      icon: LightningIcon,
      color: '#f2d14b',
    },
    {
      label: 'Running',
      value: String(countTasks(['progress'])),
      icon: CircleIcon,
      color: '#f2d14b',
    },
    {
      label: 'In review',
      value: String(countTasks(['ai-review', 'human-review'])),
      icon: MagicWandIcon,
      color: '#6aa7ff',
    },
    {
      label: 'Human gates',
      value: String(countTasks(['human-review'])),
      icon: ShieldCheckIcon,
      color: '#f26d6d',
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#101113] px-6 py-7">
      <div className="mx-auto max-w-6xl">
        <section className="mb-6 rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-[#dce0e8]">Projects</h2>
            <button
              type="button"
              onClick={() => setIsCreatingProject(true)}
              className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#2a2c31] bg-[#202227] px-3 text-xs font-semibold text-[#cfd2da] transition-colors hover:border-[#3a3d46]"
            >
              <PlusIcon className="size-4" weight="bold" />
              New project
            </button>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            {projects.map((projectItem) => (
              <button
                type="button"
                key={projectItem.id}
                onClick={() => onSelectProject(projectItem.id)}
                className={cn(
                  'rounded-[7px] border p-3 text-left transition-colors',
                  projectItem.id === activeProjectId
                    ? 'border-[#444956] bg-[#202227]'
                    : 'border-[#24262b] bg-[#111214] hover:border-[#343741]'
                )}
              >
                <span className="mb-3 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-semibold text-[#dce0e8]">
                    {projectItem.name}
                  </span>
                  {projectItem.id === activeProjectId && (
                    <span className="rounded-full border border-[#31553a] px-2 py-0.5 text-[11px] font-semibold text-[#78d16d]">
                      Active
                    </span>
                  )}
                </span>
                <span className="block truncate font-ibm-plex-mono text-xs text-[#777d88]">
                  {projectItem.repository.owner}/{projectItem.repository.name}
                </span>
                <span className="mt-3 block text-xs text-[#858b96]">
                  {projectItem.tasks.length} tasks
                </span>
              </button>
            ))}
          </div>

          {isCreatingProject && (
            <div className="mt-4 flex flex-col gap-3 rounded-[7px] border border-[#24262b] bg-[#111214] p-3 sm:flex-row sm:items-center">
              <label className="sr-only" htmlFor="new-project-name">
                Project name
              </label>
              <input
                id="new-project-name"
                value={newProjectName}
                onChange={(event) => setNewProjectName(event.target.value)}
                className="h-9 min-w-0 flex-1 rounded-[6px] border border-[#2a2c31] bg-[#17181b] px-3 text-sm text-[#dce0e8] outline-none transition-colors placeholder:text-[#626874] focus:border-[#444956]"
                placeholder="Project name"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const trimmedName = newProjectName.trim();

                    if (!trimmedName) {
                      return;
                    }

                    onCreateProject(trimmedName);
                    setNewProjectName('');
                    setIsCreatingProject(false);
                  }}
                  className="h-9 rounded-[6px] border border-[#31553a] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:bg-[#172219]"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewProjectName('');
                    setIsCreatingProject(false);
                  }}
                  className="h-9 rounded-[6px] border border-[#2a2c31] px-3 text-xs font-semibold text-[#9ca1ad] transition-colors hover:bg-[#202227]"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </section>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-4"
              >
                <div className="mb-4 flex items-center justify-between">
                  <Icon
                    className="size-5"
                    style={{ color: stat.color }}
                    weight="bold"
                  />
                  <span className="text-2xl font-semibold text-[#dce0e8]">
                    {stat.value}
                  </span>
                </div>
                <p className="text-sm font-medium text-[#858b96]">
                  {stat.label}
                </p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#dce0e8]">
                {project.name}
              </h2>
              <button
                type="button"
                onClick={() => onTabChange('settings')}
                className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#2a2c31] bg-[#202227] px-3 text-xs font-semibold text-[#cfd2da] transition-colors hover:border-[#3a3d46]"
              >
                <GearIcon className="size-4" weight="bold" />
                Project settings
              </button>
            </div>
            <p className="text-sm leading-7 text-[#9aa0aa]">{project.brief}</p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {project.contextFiles.map((file) => (
                <div
                  key={file.path}
                  className="rounded-[7px] border border-[#24262b] bg-[#111214] p-3"
                >
                  <FileTextIcon
                    className="mb-3 size-5 text-[#858b96]"
                    weight="bold"
                  />
                  <p className="truncate text-sm font-medium text-[#dce0e8]">
                    {file.path}
                  </p>
                  <p className="mt-1 text-xs text-[#777d88]">
                    {file.injected ? 'Injected into agent runs' : file.purpose}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
            <h2 className="mb-4 text-lg font-semibold text-[#dce0e8]">
              Connectors
            </h2>
            <div className="space-y-3">
              {kavbanConnectorOrder.map((connectorId) => {
                const connector = connectors[connectorId];
                const Icon = connectorIconById[connector.id];

                return (
                  <div
                    key={connector.id}
                    className="flex items-center gap-3 rounded-[7px] border border-[#24262b] bg-[#111214] p-3"
                  >
                    <span className="flex size-9 items-center justify-center rounded-[7px] bg-[#202227] text-[#cfd2da]">
                      <Icon className="size-5" weight="bold" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-[#dce0e8]">
                        {connector.name}
                      </span>
                      <span className="block truncate text-xs text-[#777d88]">
                        {connector.status}
                      </span>
                    </span>
                    <span
                      className={cn(
                        'rounded-full border px-2 py-1 text-xs font-semibold',
                        connector.connected
                          ? 'border-[#31553a] text-[#78d16d]'
                          : 'border-[#554531] text-[#f3cfa8]'
                      )}
                    >
                      {connector.connected ? 'Connected' : 'Setup'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function TaskCreatePanel({
  contextFiles,
  defaultAgentId,
  defaultHumanReviewRequired,
  defaultReviewerId,
  defaultStatus,
  dependencyTasks,
  onCancel,
  onCreate,
}: {
  contextFiles: Project['contextFiles'];
  defaultAgentId: KavbanAgentId;
  defaultHumanReviewRequired: boolean;
  defaultReviewerId: KavbanAgentId;
  defaultStatus: TaskStatus;
  dependencyTasks: Task[];
  onCancel: () => void;
  onCreate: (input: KavbanCreateTaskInput) => string | null;
}) {
  const defaultContextFiles = useMemo(
    () => contextFiles.filter((file) => file.injected).map((file) => file.path),
    [contextFiles]
  );
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<KavbanTaskPriority>('Medium');
  const [agentId, setAgentId] = useState<KavbanAgentId>(defaultAgentId);
  const [reviewerId, setReviewerId] =
    useState<KavbanAgentId>(defaultReviewerId);
  const [requiresHumanReview, setRequiresHumanReview] = useState(
    defaultHumanReviewRequired
  );
  const [tagText, setTagText] = useState('');
  const [selectedContextFiles, setSelectedContextFiles] =
    useState(defaultContextFiles);
  const [selectedDependencies, setSelectedDependencies] = useState<string[]>(
    []
  );

  useEffect(() => {
    setStatus(defaultStatus);
    setAgentId(defaultAgentId);
    setReviewerId(defaultReviewerId);
    setRequiresHumanReview(defaultHumanReviewRequired);
    setSelectedContextFiles(defaultContextFiles);
  }, [
    defaultAgentId,
    defaultContextFiles,
    defaultHumanReviewRequired,
    defaultReviewerId,
    defaultStatus,
  ]);

  const toggleContextFile = (path: string) => {
    setSelectedContextFiles((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path]
    );
  };

  const toggleDependency = (key: string) => {
    setSelectedDependencies((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  return (
    <form
      className="border-b border-[#24262b] bg-[#111214] px-6 py-5"
      onSubmit={(event) => {
        event.preventDefault();

        const createdTaskId = onCreate({
          title,
          description,
          status,
          priority,
          agentId,
          reviewerId,
          requiresHumanReview,
          tagLabels: tagText.split(','),
          dependencies: selectedDependencies,
          contextFiles: selectedContextFiles,
        });

        if (!createdTaskId) {
          return;
        }

        setTitle('');
        setDescription('');
        setTagText('');
        setSelectedDependencies([]);
      }}
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(280px,1.2fr)_0.8fr]">
        <div className="space-y-3">
          <div>
            <label
              htmlFor="task-title"
              className="mb-1.5 block text-xs font-semibold text-[#777d88]"
            >
              Title
            </label>
            <input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={`${taskFormFieldClass} h-9`}
              placeholder="Add a task title"
            />
          </div>
          <div>
            <label
              htmlFor="task-description"
              className="mb-1.5 block text-xs font-semibold text-[#777d88]"
            >
              Instructions
            </label>
            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${taskFormFieldClass} min-h-[94px] resize-y py-2 leading-6`}
              placeholder="Describe what the agent should do"
            />
          </div>
          <div>
            <label
              htmlFor="task-tags"
              className="mb-1.5 block text-xs font-semibold text-[#777d88]"
            >
              Tags
            </label>
            <input
              id="task-tags"
              value={tagText}
              onChange={(event) => setTagText(event.target.value)}
              className={`${taskFormFieldClass} h-9`}
              placeholder="Frontend, Review, Bug"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-status"
                className="mb-1.5 block text-xs font-semibold text-[#777d88]"
              >
                Status
              </label>
              <select
                id="task-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TaskStatus)
                }
                className={`${taskFormFieldClass} h-9`}
              >
                {workflowColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-priority"
                className="mb-1.5 block text-xs font-semibold text-[#777d88]"
              >
                Priority
              </label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as KavbanTaskPriority)
                }
                className={`${taskFormFieldClass} h-9`}
              >
                {taskPriorities.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                htmlFor="task-agent"
                className="mb-1.5 block text-xs font-semibold text-[#777d88]"
              >
                Agent
              </label>
              <select
                id="task-agent"
                value={agentId}
                onChange={(event) =>
                  setAgentId(event.target.value as KavbanAgentId)
                }
                className={`${taskFormFieldClass} h-9`}
              >
                {agentOptions.map((item) => (
                  <option key={item} value={item}>
                    {kavbanAgents[item].name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="task-reviewer"
                className="mb-1.5 block text-xs font-semibold text-[#777d88]"
              >
                Reviewer
              </label>
              <select
                id="task-reviewer"
                value={reviewerId}
                onChange={(event) =>
                  setReviewerId(event.target.value as KavbanAgentId)
                }
                className={`${taskFormFieldClass} h-9`}
              >
                {reviewerOptions.map((item) => (
                  <option key={item} value={item}>
                    {kavbanAgents[item].name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-[7px] border border-[#24262b] bg-[#17181b] px-3 py-2 text-sm font-semibold text-[#cfd2da]">
            <input
              type="checkbox"
              checked={requiresHumanReview}
              onChange={(event) => setRequiresHumanReview(event.target.checked)}
              className="size-4 accent-[#6aa7ff]"
            />
            <ShieldCheckIcon className="size-4 text-[#858b96]" weight="bold" />
            Require human review
          </label>

          <div>
            <p className="mb-2 text-xs font-semibold text-[#777d88]">Context</p>
            <div className="flex flex-wrap gap-2">
              {contextFiles.map((file) => {
                const selected = selectedContextFiles.includes(file.path);

                return (
                  <button
                    type="button"
                    key={file.path}
                    onClick={() => toggleContextFile(file.path)}
                    className={cn(
                      'inline-flex h-8 items-center gap-2 rounded-[6px] border px-2.5 text-xs font-semibold transition-colors',
                      selected
                        ? 'border-[#31553a] bg-[#172219] text-[#78d16d]'
                        : 'border-[#2a2c31] bg-[#202227] text-[#9ca1ad] hover:border-[#3a3d46]'
                    )}
                  >
                    <FileTextIcon className="size-3.5" weight="bold" />
                    {file.path}
                  </button>
                );
              })}
            </div>
          </div>

          {dependencyTasks.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-[#777d88]">
                Dependencies
              </p>
              <div className="flex flex-wrap gap-2">
                {dependencyTasks.map((dependency) => {
                  const selected = selectedDependencies.includes(
                    dependency.key
                  );

                  return (
                    <button
                      type="button"
                      key={dependency.id}
                      onClick={() => toggleDependency(dependency.key)}
                      className={cn(
                        'inline-flex h-8 max-w-full items-center gap-2 rounded-[6px] border px-2.5 text-xs font-semibold transition-colors',
                        selected
                          ? 'border-[#31553a] bg-[#172219] text-[#78d16d]'
                          : 'border-[#2a2c31] bg-[#202227] text-[#9ca1ad] hover:border-[#3a3d46]'
                      )}
                    >
                      <GitBranchIcon className="size-3.5" weight="bold" />
                      <span className="font-ibm-plex-mono">
                        {dependency.key}
                      </span>
                      <span className="max-w-[150px] truncate">
                        {dependency.title}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="h-9 rounded-[6px] border border-[#2a2c31] px-3 text-xs font-semibold text-[#9ca1ad] transition-colors hover:bg-[#202227]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="h-9 rounded-[6px] border border-[#31553a] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:bg-[#172219] disabled:cursor-not-allowed disabled:border-[#2a2c31] disabled:text-[#626874]"
            >
              Create task
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function TaskCard({
  task,
  selected,
  onSelect,
}: {
  task: Task;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative h-[148px] w-full overflow-hidden rounded-[8px] border bg-[#1b1d20] p-4 text-left shadow-[0_8px_22px_rgba(0,0,0,0.18)] transition-colors hover:border-[#343741]',
        selected ? 'border-[#3b3f49]' : 'border-[#24262b]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 pr-28">
          <p className="font-ibm-plex-mono text-sm text-[#646a75]">
            {task.key}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StatusIcon task={task} />
            <h3 className="truncate text-base font-medium text-[#d7d9df]">
              {task.title}
            </h3>
          </div>
        </div>
        <span className="absolute right-4 top-4 inline-flex h-7 max-w-[142px] items-center gap-1.5 rounded-full border border-[#2a2c31] bg-[#17181b] px-2.5 text-sm font-medium text-[#9ca1ad]">
          <span className="truncate">{task.state}</span>
          <AgentAvatar agent={getTaskAgent(task)} />
        </span>
      </div>

      <div className="absolute bottom-4 left-4 right-4 flex min-w-0 items-center gap-1.5 overflow-hidden">
        <span className="inline-flex size-6 items-center justify-center rounded-[5px] bg-[#282a2f] text-[#6f7682]">
          <ChartBarIcon className="size-4" weight="bold" />
        </span>
        {task.tags.slice(0, 2).map((tag) => (
          <TagPill key={tag.label} tag={tag} />
        ))}
        {task.pr && <PrPill value={task.pr} />}
      </div>
    </button>
  );
}

function TasksBoard({
  onCreateTask,
  selectedTaskId,
  onSelectTask,
  tasks,
}: {
  onCreateTask: (status: TaskStatus) => void;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  tasks: Task[];
}) {
  const tasksByStatus = useMemo(
    () =>
      workflowColumns.reduce<Record<TaskStatus, Task[]>>(
        (acc, column) => {
          acc[column.id] = tasks.filter((task) => task.status === column.id);
          return acc;
        },
        {} as Record<TaskStatus, Task[]>
      ),
    [tasks]
  );

  return (
    <div className="w-max min-w-full px-6 py-7">
      <div className="grid grid-flow-col auto-cols-[500px] gap-4">
        {workflowColumns.map((column) => {
          const Icon = workflowIconByKey[column.iconKey];
          const columnTasks = tasksByStatus[column.id];

          return (
            <section key={column.id} className="min-w-0">
              <div className="mb-4 flex h-8 items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <Icon
                    className="size-4 shrink-0"
                    style={{ color: column.color }}
                    weight="bold"
                  />
                  <h2 className="truncate text-sm font-semibold text-[#bfc3cd]">
                    {column.label}
                  </h2>
                  <span className="text-sm text-[#6f7682]">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <IconButton
                    label={`Add task to ${column.label}`}
                    icon={PlusIcon}
                    onClick={() => onCreateTask(column.id)}
                  />
                  <IconButton
                    label={`${column.label} options`}
                    icon={DotsThreeIcon}
                  />
                </div>
              </div>
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    selected={task.id === selectedTaskId}
                    onSelect={() => onSelectTask(task.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TasksList({
  selectedTaskId,
  onSelectTask,
  tasks,
}: {
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  tasks: Task[];
}) {
  return (
    <div className="min-w-[980px] px-6 py-7">
      <div className="space-y-1">
        {tasks.map((task) => {
          const blockingDependencies = getBlockingDependencies(task, tasks);

          return (
            <button
              type="button"
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={cn(
                'grid min-h-[46px] w-full grid-cols-[96px_minmax(280px,1fr)_minmax(400px,auto)] items-center gap-4 rounded-[6px] px-3 text-left text-sm transition-colors hover:bg-[#191b1f]',
                selectedTaskId === task.id && 'bg-[#191b1f]'
              )}
            >
              <span className="font-ibm-plex-mono text-[#717783]">
                {task.key}
              </span>
              <span className="flex min-w-0 items-center gap-2.5">
                <StatusIcon task={task} />
                <span className="truncate font-medium text-[#d6d8df]">
                  {task.title}
                </span>
              </span>
              <span className="flex items-center justify-end gap-2">
                {task.branch && <BranchPill value={task.branch} />}
                {blockingDependencies.length > 0 && (
                  <BlockedPill count={blockingDependencies.length} />
                )}
                <TestStatusPill status={task.testStatus} />
                <ReviewStatusPill status={task.reviewStatus} />
                {task.requiresHumanReview !== false && <HumanReviewPill />}
                {task.tags.slice(0, 2).map((tag) => (
                  <TagPill key={tag.label} tag={tag} />
                ))}
                <AgentAvatar agent={getTaskAgent(task)} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TaskEditForm({
  contextFiles,
  dependencyTasks,
  onCancel,
  onSave,
  task,
}: {
  contextFiles: Project['contextFiles'];
  dependencyTasks: Task[];
  onCancel: () => void;
  onSave: (input: KavbanUpdateTaskInput) => boolean;
  task: Task;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [priority, setPriority] = useState<KavbanTaskPriority>(task.priority);
  const [agentId, setAgentId] = useState<KavbanAgentId>(task.agentId);
  const [reviewerId, setReviewerId] = useState<KavbanAgentId>(task.reviewerId);
  const [requiresHumanReview, setRequiresHumanReview] = useState(
    task.requiresHumanReview ?? true
  );
  const [branch, setBranch] = useState(task.branch ?? '');
  const [tagText, setTagText] = useState(
    task.tags.map((tag) => tag.label).join(', ')
  );
  const [selectedContextFiles, setSelectedContextFiles] = useState(
    task.contextFiles
  );
  const [selectedDependencies, setSelectedDependencies] = useState(
    task.dependencies
  );

  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description);
    setStatus(task.status);
    setPriority(task.priority);
    setAgentId(task.agentId);
    setReviewerId(task.reviewerId);
    setRequiresHumanReview(task.requiresHumanReview ?? true);
    setBranch(task.branch ?? '');
    setTagText(task.tags.map((tag) => tag.label).join(', '));
    setSelectedContextFiles(task.contextFiles);
    setSelectedDependencies(task.dependencies);
  }, [task]);

  const toggleContextFile = (path: string) => {
    setSelectedContextFiles((current) =>
      current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path]
    );
  };

  const toggleDependency = (key: string) => {
    setSelectedDependencies((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key]
    );
  };

  return (
    <form
      className="space-y-4 px-5 py-5"
      onSubmit={(event) => {
        event.preventDefault();

        const saved = onSave({
          title,
          description,
          status,
          priority,
          agentId,
          reviewerId,
          requiresHumanReview,
          branch,
          tagLabels: tagText.split(','),
          dependencies: selectedDependencies,
          contextFiles: selectedContextFiles,
        });

        if (saved) {
          onCancel();
        }
      }}
    >
      <div>
        <label
          htmlFor="edit-task-title"
          className="mb-1.5 block text-xs font-semibold text-[#777d88]"
        >
          Title
        </label>
        <input
          id="edit-task-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className={`${taskFormFieldClass} h-9`}
        />
      </div>

      <div>
        <label
          htmlFor="edit-task-description"
          className="mb-1.5 block text-xs font-semibold text-[#777d88]"
        >
          Instructions
        </label>
        <textarea
          id="edit-task-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          className={`${taskFormFieldClass} min-h-[112px] resize-y py-2 leading-6`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div>
          <label
            htmlFor="edit-task-status"
            className="mb-1.5 block text-xs font-semibold text-[#777d88]"
          >
            Status
          </label>
          <select
            id="edit-task-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as TaskStatus)}
            className={`${taskFormFieldClass} h-9`}
          >
            {workflowColumns.map((column) => (
              <option key={column.id} value={column.id}>
                {column.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="edit-task-priority"
            className="mb-1.5 block text-xs font-semibold text-[#777d88]"
          >
            Priority
          </label>
          <select
            id="edit-task-priority"
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as KavbanTaskPriority)
            }
            className={`${taskFormFieldClass} h-9`}
          >
            {taskPriorities.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <div>
          <label
            htmlFor="edit-task-agent"
            className="mb-1.5 block text-xs font-semibold text-[#777d88]"
          >
            Agent
          </label>
          <select
            id="edit-task-agent"
            value={agentId}
            onChange={(event) =>
              setAgentId(event.target.value as KavbanAgentId)
            }
            className={`${taskFormFieldClass} h-9`}
          >
            {agentOptions.map((item) => (
              <option key={item} value={item}>
                {kavbanAgents[item].name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="edit-task-reviewer"
            className="mb-1.5 block text-xs font-semibold text-[#777d88]"
          >
            Reviewer
          </label>
          <select
            id="edit-task-reviewer"
            value={reviewerId}
            onChange={(event) =>
              setReviewerId(event.target.value as KavbanAgentId)
            }
            className={`${taskFormFieldClass} h-9`}
          >
            {reviewerOptions.map((item) => (
              <option key={item} value={item}>
                {kavbanAgents[item].name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-[7px] border border-[#24262b] bg-[#111214] px-3 py-2 text-sm font-semibold text-[#cfd2da]">
        <input
          type="checkbox"
          checked={requiresHumanReview}
          onChange={(event) => setRequiresHumanReview(event.target.checked)}
          className="size-4 accent-[#6aa7ff]"
        />
        <ShieldCheckIcon className="size-4 text-[#858b96]" weight="bold" />
        Require human review
      </label>

      <div>
        <label
          htmlFor="edit-task-branch"
          className="mb-1.5 block text-xs font-semibold text-[#777d88]"
        >
          Branch
        </label>
        <div className="relative">
          <GitBranchIcon
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#58b957]"
            weight="bold"
          />
          <input
            id="edit-task-branch"
            value={branch}
            onChange={(event) => setBranch(event.target.value)}
            className={cn(taskFormFieldClass, 'h-9 pl-9 font-ibm-plex-mono')}
            placeholder="kav/kav-000123-task-name"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="edit-task-tags"
          className="mb-1.5 block text-xs font-semibold text-[#777d88]"
        >
          Tags
        </label>
        <input
          id="edit-task-tags"
          value={tagText}
          onChange={(event) => setTagText(event.target.value)}
          className={`${taskFormFieldClass} h-9`}
        />
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold text-[#777d88]">Context</p>
        <div className="flex flex-wrap gap-2">
          {contextFiles.map((file) => {
            const selected = selectedContextFiles.includes(file.path);

            return (
              <button
                type="button"
                key={file.path}
                onClick={() => toggleContextFile(file.path)}
                className={cn(
                  'inline-flex h-8 items-center gap-2 rounded-[6px] border px-2.5 text-xs font-semibold transition-colors',
                  selected
                    ? 'border-[#31553a] bg-[#172219] text-[#78d16d]'
                    : 'border-[#2a2c31] bg-[#202227] text-[#9ca1ad] hover:border-[#3a3d46]'
                )}
              >
                <FileTextIcon className="size-3.5" weight="bold" />
                {file.path}
              </button>
            );
          })}
        </div>
      </div>

      {dependencyTasks.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold text-[#777d88]">
            Dependencies
          </p>
          <div className="flex flex-wrap gap-2">
            {dependencyTasks.map((dependency) => {
              const selected = selectedDependencies.includes(dependency.key);

              return (
                <button
                  type="button"
                  key={dependency.id}
                  onClick={() => toggleDependency(dependency.key)}
                  className={cn(
                    'inline-flex h-8 max-w-full items-center gap-2 rounded-[6px] border px-2.5 text-xs font-semibold transition-colors',
                    selected
                      ? 'border-[#31553a] bg-[#172219] text-[#78d16d]'
                      : 'border-[#2a2c31] bg-[#202227] text-[#9ca1ad] hover:border-[#3a3d46]'
                  )}
                >
                  <GitBranchIcon className="size-3.5" weight="bold" />
                  <span className="font-ibm-plex-mono">{dependency.key}</span>
                  <span className="max-w-[150px] truncate">
                    {dependency.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-9 rounded-[6px] border border-[#2a2c31] px-3 text-xs font-semibold text-[#9ca1ad] transition-colors hover:bg-[#202227]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!title.trim()}
          className="h-9 rounded-[6px] border border-[#31553a] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:bg-[#172219] disabled:cursor-not-allowed disabled:border-[#2a2c31] disabled:text-[#626874]"
        >
          Save changes
        </button>
      </div>
    </form>
  );
}

function TaskDetailPanel({
  contextFiles,
  onAddTaskComment,
  onCreateAiReview,
  onDeleteTask,
  onMoveTask,
  onOpenTaskPullRequest,
  onRecordHumanReview,
  onRecordRunCheck,
  onStartAgentRun,
  onUpdateTask,
  projectTasks,
  task,
}: {
  contextFiles: Project['contextFiles'];
  onAddTaskComment: (
    taskId: string,
    input: KavbanAddTaskCommentInput
  ) => boolean;
  onCreateAiReview: (taskId: string) => string | null;
  onDeleteTask: (taskId: string) => boolean;
  onMoveTask: (taskId: string, status: TaskStatus) => boolean;
  onOpenTaskPullRequest: (taskId: string) => string | null;
  onRecordHumanReview: (
    taskId: string,
    input: KavbanRecordHumanReviewInput
  ) => boolean;
  onRecordRunCheck: (
    taskId: string,
    runId: string,
    input: KavbanRecordRunCheckInput
  ) => boolean;
  onStartAgentRun: (taskId: string) => string | null;
  onUpdateTask: (taskId: string, input: KavbanUpdateTaskInput) => boolean;
  projectTasks: Task[];
  task: Task;
}) {
  const [commentText, setCommentText] = useState('');
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const dependencyItems = getDependencyItems(task, projectTasks);
  const blockingDependencies = getBlockingDependencies(task, projectTasks);
  const advanceAction = taskAdvanceActions[task.status];
  const isAdvanceBlocked =
    advanceAction?.status === 'progress' && blockingDependencies.length > 0;
  const agentRuns = task.agentRuns ?? [];
  const isRunAgentBlocked =
    task.status === 'done' || blockingDependencies.length > 0;
  const reviewReports = task.reviewReports ?? [];
  const canRunAiReview =
    task.testStatus === 'passed' &&
    task.status !== 'done' &&
    reviewReports.length === 0;

  useEffect(() => {
    setCommentText('');
    setIsConfirmingDelete(false);
    setIsEditing(false);
  }, [task.id]);

  if (isEditing) {
    return (
      <aside className="hidden w-[380px] shrink-0 overflow-y-auto border-l border-[#24262b] bg-[#111214] xl:block">
        <div className="border-b border-[#24262b] px-5 py-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-ibm-plex-mono text-sm text-[#6f7682]">
              {task.key}
            </span>
            <IconButton
              label="Cancel editing"
              icon={XIcon}
              onClick={() => setIsEditing(false)}
            />
          </div>
          <h2 className="text-lg font-semibold text-[#dce0e8]">Edit task</h2>
        </div>
        <TaskEditForm
          contextFiles={contextFiles}
          dependencyTasks={projectTasks.filter((item) => item.id !== task.id)}
          onCancel={() => setIsEditing(false)}
          onSave={(input) => onUpdateTask(task.id, input)}
          task={task}
        />
      </aside>
    );
  }

  return (
    <aside className="hidden w-[380px] shrink-0 border-l border-[#24262b] bg-[#111214] xl:block">
      <div className="border-b border-[#24262b] px-5 py-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-ibm-plex-mono text-sm text-[#6f7682]">
            {task.key}
          </span>
          <div className="flex items-center gap-1">
            <IconButton
              label="Edit task"
              icon={PencilSimpleIcon}
              onClick={() => setIsEditing(true)}
            />
            <IconButton
              label={isConfirmingDelete ? 'Confirm delete task' : 'Delete task'}
              icon={isConfirmingDelete ? CheckCircleIcon : TrashIcon}
              onClick={() => {
                if (isConfirmingDelete) {
                  onDeleteTask(task.id);
                  return;
                }

                setIsConfirmingDelete(true);
              }}
            />
            <IconButton
              label="Task options"
              icon={DotsThreeIcon}
              onClick={() => setIsConfirmingDelete(false)}
            />
          </div>
        </div>
        <h2 className="text-lg font-semibold text-[#dce0e8]">{task.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#8d939f]">
          {task.description}
        </p>
        {isConfirmingDelete && (
          <div className="mt-4 rounded-[7px] border border-[#553131] bg-[#211719] px-3 py-2 text-xs font-medium text-[#f26d6d]">
            Delete task?
          </div>
        )}
      </div>

      <div className="space-y-5 px-5 py-5">
        {task.status === 'ready' && (
          <button
            type="button"
            disabled={isRunAgentBlocked}
            onClick={() => onStartAgentRun(task.id)}
            className={cn(
              'flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border px-3 text-xs font-semibold transition-colors',
              isRunAgentBlocked
                ? 'cursor-not-allowed border-[#553131] bg-[#211719] text-[#f26d6d]'
                : 'border-[#31553a] bg-[#172219] text-[#78d16d] hover:border-[#427049]'
            )}
          >
            <TerminalIcon className="size-4" weight="bold" />
            {isRunAgentBlocked ? 'Blocked' : 'Run agent'}
          </button>
        )}

        {task.status !== 'ready' && advanceAction && (
          <button
            type="button"
            disabled={isAdvanceBlocked}
            onClick={() => onMoveTask(task.id, advanceAction.status)}
            className={cn(
              'flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border px-3 text-xs font-semibold transition-colors',
              isAdvanceBlocked
                ? 'cursor-not-allowed border-[#553131] bg-[#211719] text-[#f26d6d]'
                : 'border-[#31553a] bg-[#172219] text-[#78d16d] hover:border-[#427049]'
            )}
          >
            <LightningIcon className="size-4" weight="bold" />
            {isAdvanceBlocked ? 'Blocked' : advanceAction.label}
          </button>
        )}

        {canRunAiReview && (
          <button
            type="button"
            onClick={() => onCreateAiReview(task.id)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border border-[#334b70] bg-[#141c2a] px-3 text-xs font-semibold text-[#8bbcff] transition-colors hover:border-[#43618f]"
          >
            <SparkleIcon className="size-4" weight="bold" />
            Run AI review
          </button>
        )}

        {!task.pr && (
          <button
            type="button"
            onClick={() => onOpenTaskPullRequest(task.id)}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-[6px] border border-[#31553a] bg-[#172219] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:border-[#427049]"
          >
            <GitPullRequestIcon className="size-4" weight="bold" />
            Open draft PR
          </button>
        )}

        {task.status === 'human-review' && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                onRecordHumanReview(task.id, {
                  status: 'approved',
                  note: 'Human approved the task for merge.',
                })
              }
              className="flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#31553a] bg-[#172219] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:border-[#427049]"
            >
              <CheckCircleIcon className="size-4" weight="fill" />
              Approve
            </button>
            <button
              type="button"
              onClick={() =>
                onRecordHumanReview(task.id, {
                  status: 'changes-requested',
                  note: 'Human requested changes from the assigned agent.',
                })
              }
              className="flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#553131] bg-[#211719] px-3 text-xs font-semibold text-[#f26d6d] transition-colors hover:border-[#6b3b3b]"
            >
              <XIcon className="size-4" weight="bold" />
              Request changes
            </button>
          </div>
        )}

        {blockingDependencies.length > 0 && (
          <div className="rounded-[7px] border border-[#553131] bg-[#211719] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#f26d6d]">
              <ShieldCheckIcon className="size-4" weight="bold" />
              Blocked by dependencies
            </div>
            <div className="space-y-2">
              {blockingDependencies.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-2 text-sm text-[#cfa0a0]"
                >
                  <span className="font-ibm-plex-mono text-xs">
                    {item.task?.key ?? item.key}
                  </span>
                  <span className="min-w-0 truncate">
                    {item.task?.title ?? 'Missing dependency'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 text-sm">
          {[
            ['Status', task.state],
            ['Priority', task.priority],
            ['Agent', getTaskAgent(task).name],
            ['Reviewer', getTaskReviewer(task).name],
            ['Branch', task.branch ?? 'Not planned'],
            ['PR', task.pr ?? 'Not opened'],
            ['Tests', task.testStatus ?? 'Not run'],
            ['Review', task.reviewStatus ?? 'Not reviewed'],
            ['Approval', task.approvalStatus ?? 'Not requested'],
            [
              'Human review',
              task.requiresHumanReview === false ? 'Optional' : 'Required',
            ],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-[#777d88]">{label}</span>
              <span className="min-w-0 truncate text-right text-[#cfd2da]">
                {value}
              </span>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#dce0e8]">
            Context files
          </h3>
          <div className="space-y-2">
            {task.contextFiles.map((file) => (
              <div
                key={file}
                className="flex items-center gap-2 rounded-[6px] border border-[#24262b] bg-[#17181b] px-3 py-2 text-sm text-[#aeb3bd]"
              >
                <FileTextIcon className="size-4 text-[#777d88]" weight="bold" />
                {file}
              </div>
            ))}
          </div>
        </div>

        {dependencyItems.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-[#dce0e8]">
              Dependencies
            </h3>
            <div className="space-y-2">
              {dependencyItems.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-2 rounded-[6px] border border-[#24262b] bg-[#17181b] px-3 py-2 text-sm text-[#aeb3bd]"
                >
                  <GitBranchIcon
                    className="size-4 text-[#58b957]"
                    weight="bold"
                  />
                  <span className="font-ibm-plex-mono text-xs">
                    {item.task?.key ?? item.key}
                  </span>
                  {item.task && (
                    <span className="min-w-0 truncate">{item.task.title}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#dce0e8]">
            Agent runs
          </h3>
          {agentRuns.length > 0 ? (
            <div className="space-y-3">
              {agentRuns.map((run) => (
                <AgentRunCard
                  key={run.id}
                  onRecordCheck={(runId, input) =>
                    onRecordRunCheck(task.id, runId, input)
                  }
                  run={run}
                />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[6px] border border-[#24262b] bg-[#17181b] px-3 py-2 text-sm text-[#8d939f]">
              <TerminalIcon className="size-4 text-[#777d88]" weight="bold" />
              No agent runs yet
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#dce0e8]">
            AI review
          </h3>
          {reviewReports.length > 0 ? (
            <div className="space-y-3">
              {reviewReports.map((report) => (
                <ReviewReportCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[6px] border border-[#24262b] bg-[#17181b] px-3 py-2 text-sm text-[#8d939f]">
              <SparkleIcon className="size-4 text-[#777d88]" weight="bold" />
              No AI review yet
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#dce0e8]">Chat</h3>
          <form
            className="mb-3 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();

              const saved = onAddTaskComment(task.id, { body: commentText });

              if (saved) {
                setCommentText('');
              }
            }}
          >
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Leave a note for the agent"
              className={`${taskFormFieldClass} min-h-[76px] resize-y py-2 leading-5`}
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              className="flex h-8 w-full items-center justify-center gap-2 rounded-[6px] border border-[#2a2c31] bg-[#202227] px-3 text-xs font-semibold text-[#cfd2da] transition-colors hover:border-[#3a3d46] disabled:cursor-not-allowed disabled:text-[#626874]"
            >
              <PencilSimpleIcon className="size-3.5" weight="bold" />
              Add comment
            </button>
          </form>
          {task.comments && task.comments.length > 0 ? (
            <div className="space-y-2">
              {task.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-[7px] border border-[#24262b] bg-[#17181b] px-3 py-2 text-sm text-[#aeb3bd]"
                >
                  <div className="mb-1 flex items-center justify-between gap-3 text-xs text-[#777d88]">
                    <span>
                      {comment.actor === 'human'
                        ? 'Human'
                        : kavbanAgents[comment.actor].name}
                    </span>
                    <span className="font-ibm-plex-mono">
                      {new Date(comment.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="leading-5">{comment.body}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-[6px] border border-[#24262b] bg-[#17181b] px-3 py-2 text-sm text-[#8d939f]">
              <PencilSimpleIcon
                className="size-4 text-[#777d88]"
                weight="bold"
              />
              No comments yet
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-[#dce0e8]">
            Activity
          </h3>
          <div className="space-y-3">
            {getTaskActivity(task).map((entry) => (
              <div key={entry} className="flex gap-2 text-sm text-[#8d939f]">
                <ClockIcon className="mt-0.5 size-4 shrink-0 text-[#777d88]" />
                {entry}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

function WorkspaceTasks({
  agentRouting,
  contextFiles,
  onCreateAiReview,
  onAddTaskComment,
  onCreateTask,
  onDeleteTask,
  onMoveTask,
  onOpenTaskPullRequest,
  onRecordHumanReview,
  onRecordRunCheck,
  onStartAgentRun,
  onUpdateTask,
  projectName,
  taskView,
  onTaskViewChange,
  selectedTaskId,
  onSelectTask,
  tasks,
}: {
  agentRouting: KavbanAgentRoutingInput;
  contextFiles: Project['contextFiles'];
  onCreateAiReview: (taskId: string) => string | null;
  onAddTaskComment: (
    taskId: string,
    input: KavbanAddTaskCommentInput
  ) => boolean;
  onCreateTask: (input: KavbanCreateTaskInput) => string | null;
  onDeleteTask: (taskId: string) => boolean;
  onMoveTask: (taskId: string, status: TaskStatus) => boolean;
  onOpenTaskPullRequest: (taskId: string) => string | null;
  onRecordHumanReview: (
    taskId: string,
    input: KavbanRecordHumanReviewInput
  ) => boolean;
  onRecordRunCheck: (
    taskId: string,
    runId: string,
    input: KavbanRecordRunCheckInput
  ) => boolean;
  onStartAgentRun: (taskId: string) => string | null;
  onUpdateTask: (taskId: string, input: KavbanUpdateTaskInput) => boolean;
  projectName: string;
  taskView: TaskView;
  onTaskViewChange: (view: TaskView) => void;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  tasks: Task[];
}) {
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [taskCreateStatus, setTaskCreateStatus] =
    useState<TaskStatus>('backlog');
  const selectedTask =
    tasks.find((task) => task.id === selectedTaskId) ?? tasks[0];

  const openCreateTask = (status: TaskStatus = 'backlog') => {
    setTaskCreateStatus(status);
    setIsCreatingTask(true);
  };

  const handleCreateTask = (input: KavbanCreateTaskInput) => {
    const createdTaskId = onCreateTask(input);

    if (createdTaskId) {
      onSelectTask(createdTaskId);
      setIsCreatingTask(false);
    }

    return createdTaskId;
  };

  const handleDeleteTask = (taskId: string) => {
    const remainingTask = tasks.find((task) => task.id !== taskId);
    const deleted = onDeleteTask(taskId);

    if (deleted && remainingTask) {
      onSelectTask(remainingTask.id);
    }

    return deleted;
  };

  return (
    <div className="flex h-full min-h-0">
      <main className="min-w-0 flex-1 overflow-auto bg-[#101113]">
        <TopBar
          title="Tasks"
          eyebrow={projectName}
          rightSlot={
            <>
              <div className="mr-2 flex shrink-0 rounded-[7px] bg-[#191b1f] p-1">
                {[
                  { id: 'board' as const, label: 'Board', icon: KanbanIcon },
                  { id: 'list' as const, label: 'List', icon: ListChecksIcon },
                ].map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => onTaskViewChange(item.id)}
                      className={cn(
                        'flex h-8 items-center gap-2 rounded-[6px] px-3 text-xs font-semibold transition-colors',
                        taskView === item.id
                          ? 'bg-[#25272d] text-[#dce0e8]'
                          : 'text-[#777d88] hover:text-[#cfd2dc]'
                      )}
                    >
                      <Icon className="size-4" weight="bold" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <IconButton label="Filter tasks" icon={FunnelSimpleIcon} />
              <IconButton label="Task display" icon={SlidersHorizontalIcon} />
              <IconButton
                label="New task"
                icon={PlusIcon}
                onClick={() => openCreateTask()}
              />
            </>
          }
        />
        {isCreatingTask && (
          <TaskCreatePanel
            contextFiles={contextFiles}
            defaultAgentId={agentRouting.defaultAgentId}
            defaultHumanReviewRequired={agentRouting.humanReviewRequired}
            defaultReviewerId={agentRouting.reviewerAgentId}
            defaultStatus={taskCreateStatus}
            dependencyTasks={tasks}
            onCancel={() => setIsCreatingTask(false)}
            onCreate={handleCreateTask}
          />
        )}
        {tasks.length === 0 ? (
          <div className="flex h-[calc(100%-73px)] flex-col items-center justify-center gap-4 px-6 py-7 text-center">
            <ListChecksIcon className="size-9 text-[#626874]" weight="bold" />
            <div>
              <p className="text-sm font-semibold text-[#dce0e8]">
                No tasks in this project yet
              </p>
              <p className="mt-1 text-sm text-[#858b96]">
                Create the first task to start the board.
              </p>
            </div>
            <button
              type="button"
              onClick={() => openCreateTask()}
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#2a2c31] bg-[#202227] px-3 text-xs font-semibold text-[#cfd2da] transition-colors hover:border-[#3a3d46]"
            >
              <PlusIcon className="size-4" weight="bold" />
              New task
            </button>
          </div>
        ) : taskView === 'board' ? (
          <TasksBoard
            onCreateTask={openCreateTask}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            tasks={tasks}
          />
        ) : (
          <TasksList
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            tasks={tasks}
          />
        )}
      </main>
      {selectedTask && taskView === 'list' && (
        <TaskDetailPanel
          contextFiles={contextFiles}
          onAddTaskComment={onAddTaskComment}
          onCreateAiReview={onCreateAiReview}
          onDeleteTask={handleDeleteTask}
          onMoveTask={onMoveTask}
          onOpenTaskPullRequest={onOpenTaskPullRequest}
          onRecordHumanReview={onRecordHumanReview}
          onRecordRunCheck={onRecordRunCheck}
          onStartAgentRun={onStartAgentRun}
          onUpdateTask={onUpdateTask}
          projectTasks={tasks}
          task={selectedTask}
        />
      )}
    </div>
  );
}

function ConnectorCard({
  connector,
  onToggle,
}: {
  connector: Connector;
  onToggle: (id: ConnectorId) => void;
}) {
  const Icon = connectorIconById[connector.id];

  return (
    <div className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 items-center justify-center rounded-[8px] bg-[#202227] text-[#dce0e8]">
          <Icon className="size-5" weight="bold" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[#dce0e8]">
              {connector.name}
            </h3>
            <button
              type="button"
              onClick={() => onToggle(connector.id)}
              className={cn(
                'rounded-[6px] border px-3 py-1 text-xs font-semibold transition-colors',
                connector.connected
                  ? 'border-[#31553a] text-[#78d16d] hover:bg-[#172219]'
                  : 'border-[#554531] text-[#f3cfa8] hover:bg-[#221c14]'
              )}
            >
              {connector.connected ? 'Connected' : 'Connect'}
            </button>
          </div>
          <p className="mt-2 text-sm leading-6 text-[#8d939f]">
            {connector.description}
          </p>
          <p className="mt-3 truncate font-ibm-plex-mono text-xs text-[#777d88]">
            {connector.status}
          </p>
        </div>
      </div>
    </div>
  );
}

function WorkspaceSettings({
  agentRouting,
  brief,
  connectors,
  contextFiles,
  repository,
  onAgentRoutingChange,
  onBriefChange,
  onCreateContextFile,
  onDeleteContextFile,
  onRepositoryChange,
  onToggleConnector,
  onUpdateContextFile,
}: {
  agentRouting: KavbanAgentRoutingInput;
  brief: string;
  connectors: Record<ConnectorId, Connector>;
  contextFiles: Project['contextFiles'];
  repository: Project['repository'];
  onAgentRoutingChange: (input: KavbanAgentRoutingInput) => boolean;
  onBriefChange: (value: string) => void;
  onCreateContextFile: (input: KavbanContextFileInput) => boolean;
  onDeleteContextFile: (path: string) => boolean;
  onRepositoryChange: (input: KavbanRepositoryInput) => boolean;
  onToggleConnector: (id: ConnectorId) => void;
  onUpdateContextFile: (path: string, input: KavbanContextFileInput) => boolean;
}) {
  const [agentRoutingError, setAgentRoutingError] = useState('');
  const [draftAgentRouting, setDraftAgentRouting] =
    useState<KavbanAgentRoutingInput>(agentRouting);
  const [repositoryError, setRepositoryError] = useState('');
  const [draftRepository, setDraftRepository] = useState<KavbanRepositoryInput>(
    {
      owner: repository.owner,
      name: repository.name,
      defaultBranch: repository.defaultBranch,
      localPath: repository.localPath ?? '',
    }
  );
  const [contextError, setContextError] = useState('');
  const [newContextPath, setNewContextPath] = useState('');
  const [newContextPurpose, setNewContextPurpose] = useState('');
  const [newContextInjected, setNewContextInjected] = useState(true);
  const [editingContextPath, setEditingContextPath] = useState<string | null>(
    null
  );
  const [draftContextPath, setDraftContextPath] = useState('');
  const [draftContextPurpose, setDraftContextPurpose] = useState('');
  const [draftContextInjected, setDraftContextInjected] = useState(true);

  useEffect(() => {
    setDraftAgentRouting(agentRouting);
    setAgentRoutingError('');
  }, [agentRouting]);

  useEffect(() => {
    setDraftRepository({
      owner: repository.owner,
      name: repository.name,
      defaultBranch: repository.defaultBranch,
      localPath: repository.localPath ?? '',
    });
    setRepositoryError('');
  }, [
    repository.defaultBranch,
    repository.localPath,
    repository.name,
    repository.owner,
  ]);

  useEffect(() => {
    if (
      editingContextPath &&
      !contextFiles.some((file) => file.path === editingContextPath)
    ) {
      setEditingContextPath(null);
    }
  }, [contextFiles, editingContextPath]);

  const resetNewContextFile = () => {
    setNewContextPath('');
    setNewContextPurpose('');
    setNewContextInjected(true);
  };

  const updateDraftRepository = (
    field: keyof KavbanRepositoryInput,
    value: string
  ) => {
    setDraftRepository((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateDraftAgentRouting = <Key extends keyof KavbanAgentRoutingInput>(
    field: Key,
    value: KavbanAgentRoutingInput[Key]
  ) => {
    setDraftAgentRouting((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveRepository = () => {
    const saved = onRepositoryChange(draftRepository);

    if (!saved) {
      setRepositoryError(
        'Owner, repository name, and default branch are required.'
      );
      return;
    }

    setRepositoryError('');
  };

  const saveAgentRouting = () => {
    const saved = onAgentRoutingChange(draftAgentRouting);

    if (!saved) {
      setAgentRoutingError('Choose valid agents before saving routing.');
      return;
    }

    setAgentRoutingError('');
  };

  const createContextFile = () => {
    const created = onCreateContextFile({
      path: newContextPath,
      purpose: newContextPurpose,
      injected: newContextInjected,
    });

    if (!created) {
      setContextError('Use a unique context file path before adding it.');
      return;
    }

    setContextError('');
    resetNewContextFile();
  };

  const startEditingContextFile = (file: Project['contextFiles'][number]) => {
    setContextError('');
    setEditingContextPath(file.path);
    setDraftContextPath(file.path);
    setDraftContextPurpose(file.purpose);
    setDraftContextInjected(file.injected);
  };

  const saveContextFile = () => {
    if (!editingContextPath) {
      return;
    }

    const saved = onUpdateContextFile(editingContextPath, {
      path: draftContextPath,
      purpose: draftContextPurpose,
      injected: draftContextInjected,
    });

    if (!saved) {
      setContextError('Use a unique context file path before saving.');
      return;
    }

    setContextError('');
    setEditingContextPath(null);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#101113] px-6 py-7">
      <div className="mx-auto max-w-5xl space-y-5">
        <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
          <div className="mb-4 flex items-center gap-3">
            <FileTextIcon className="size-5 text-[#858b96]" weight="bold" />
            <h2 className="text-lg font-semibold text-[#dce0e8]">
              Project brief
            </h2>
          </div>
          <label className="sr-only" htmlFor="project-brief">
            Project brief
          </label>
          <textarea
            id="project-brief"
            value={brief}
            onChange={(event) => onBriefChange(event.target.value)}
            className="min-h-[160px] w-full resize-y rounded-[7px] border border-[#2a2c31] bg-[#111214] p-4 text-sm leading-6 text-[#dce0e8] outline-none transition-colors placeholder:text-[#626874] focus:border-[#444956]"
          />
        </section>

        <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <RobotIcon className="size-5 text-[#858b96]" weight="bold" />
              <h2 className="text-lg font-semibold text-[#dce0e8]">Agents</h2>
            </div>
            <span className="rounded-full border border-[#2a2c31] px-2 py-1 text-xs font-semibold text-[#858b96]">
              {kavbanAgents[draftAgentRouting.defaultAgentId].name} default
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <CompassIcon className="size-3.5" weight="bold" />
                Default worker
              </span>
              <select
                value={draftAgentRouting.defaultAgentId}
                onChange={(event) =>
                  updateDraftAgentRouting(
                    'defaultAgentId',
                    event.target.value as KavbanAgentId
                  )
                }
                className={cn(taskFormFieldClass, 'h-9')}
              >
                {agentOptions.map((agentId) => (
                  <option key={agentId} value={agentId}>
                    {kavbanAgents[agentId].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <SparkleIcon className="size-3.5" weight="bold" />
                UI and product work
              </span>
              <select
                value={draftAgentRouting.uiAgentId}
                onChange={(event) =>
                  updateDraftAgentRouting(
                    'uiAgentId',
                    event.target.value as KavbanAgentId
                  )
                }
                className={cn(taskFormFieldClass, 'h-9')}
              >
                {agentOptions.map((agentId) => (
                  <option key={agentId} value={agentId}>
                    {kavbanAgents[agentId].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <TerminalIcon className="size-3.5" weight="bold" />
                Code and tests
              </span>
              <select
                value={draftAgentRouting.codeAgentId}
                onChange={(event) =>
                  updateDraftAgentRouting(
                    'codeAgentId',
                    event.target.value as KavbanAgentId
                  )
                }
                className={cn(taskFormFieldClass, 'h-9')}
              >
                {agentOptions.map((agentId) => (
                  <option key={agentId} value={agentId}>
                    {kavbanAgents[agentId].name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <ShieldCheckIcon className="size-3.5" weight="bold" />
                Reviewer
              </span>
              <select
                value={draftAgentRouting.reviewerAgentId}
                onChange={(event) =>
                  updateDraftAgentRouting(
                    'reviewerAgentId',
                    event.target.value as KavbanAgentId
                  )
                }
                className={cn(taskFormFieldClass, 'h-9')}
              >
                {reviewerOptions.map((agentId) => (
                  <option key={agentId} value={agentId}>
                    {kavbanAgents[agentId].name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-[#24262b] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-3 text-sm font-semibold text-[#cfd2da]">
              <input
                type="checkbox"
                checked={draftAgentRouting.humanReviewRequired}
                onChange={(event) =>
                  updateDraftAgentRouting(
                    'humanReviewRequired',
                    event.target.checked
                  )
                }
                className="size-4 accent-[#6aa7ff]"
              />
              Require human review by default
            </label>
            <button
              type="button"
              onClick={saveAgentRouting}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#31553a] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:bg-[#172219]"
            >
              <CheckCircleIcon className="size-4" weight="bold" />
              Save routing
            </button>
          </div>

          {agentRoutingError && (
            <p className="mt-4 rounded-[6px] border border-[#5c3434] bg-[#211719] px-3 py-2 text-xs font-semibold text-[#f26d6d]">
              {agentRoutingError}
            </p>
          )}
        </section>

        <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <GithubLogoIcon className="size-5 text-[#858b96]" weight="bold" />
              <h2 className="text-lg font-semibold text-[#dce0e8]">
                Repository
              </h2>
            </div>
            <span className="rounded-full border border-[#2a2c31] px-2 py-1 font-ibm-plex-mono text-xs font-semibold text-[#858b96]">
              {repository.owner}/{repository.name}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <UserIcon className="size-3.5" weight="bold" />
                Owner
              </span>
              <input
                value={draftRepository.owner}
                onChange={(event) =>
                  updateDraftRepository('owner', event.target.value)
                }
                className={cn(taskFormFieldClass, 'h-9')}
                placeholder="nivak86"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <GithubLogoIcon className="size-3.5" weight="bold" />
                Repository
              </span>
              <input
                value={draftRepository.name}
                onChange={(event) =>
                  updateDraftRepository('name', event.target.value)
                }
                className={cn(taskFormFieldClass, 'h-9')}
                placeholder="kavban"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <GitBranchIcon className="size-3.5" weight="bold" />
                Default branch
              </span>
              <input
                value={draftRepository.defaultBranch}
                onChange={(event) =>
                  updateDraftRepository('defaultBranch', event.target.value)
                }
                className={cn(taskFormFieldClass, 'h-9')}
                placeholder="main"
              />
            </label>
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                <TerminalIcon className="size-3.5" weight="bold" />
                Local path
              </span>
              <input
                value={draftRepository.localPath}
                onChange={(event) =>
                  updateDraftRepository('localPath', event.target.value)
                }
                className={cn(taskFormFieldClass, 'h-9')}
                placeholder="/Users/kavinbakhda/Desktop/KAVBAN"
              />
            </label>
          </div>

          {repositoryError && (
            <p className="mt-4 rounded-[6px] border border-[#5c3434] bg-[#211719] px-3 py-2 text-xs font-semibold text-[#f26d6d]">
              {repositoryError}
            </p>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={saveRepository}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#31553a] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:bg-[#172219]"
            >
              <CheckCircleIcon className="size-4" weight="bold" />
              Save repository
            </button>
          </div>
        </section>

        <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileTextIcon className="size-5 text-[#858b96]" weight="bold" />
              <h2 className="text-lg font-semibold text-[#dce0e8]">
                Context files
              </h2>
            </div>
            <span className="rounded-full border border-[#2a2c31] px-2 py-1 text-xs font-semibold text-[#858b96]">
              {contextFiles.filter((file) => file.injected).length}/
              {contextFiles.length} injected
            </span>
          </div>

          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1.3fr_auto_auto] lg:items-end">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                Path
              </span>
              <input
                value={newContextPath}
                onChange={(event) => setNewContextPath(event.target.value)}
                placeholder="current-state.md"
                className={cn(taskFormFieldClass, 'h-9')}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-[#777d88]">
                Purpose
              </span>
              <input
                value={newContextPurpose}
                onChange={(event) => setNewContextPurpose(event.target.value)}
                placeholder="Current priorities and recent decisions"
                className={cn(taskFormFieldClass, 'h-9')}
              />
            </label>
            <label className="flex h-9 items-center gap-2 rounded-[6px] border border-[#2a2c31] bg-[#111214] px-3 text-xs font-semibold text-[#cfd2da]">
              <input
                type="checkbox"
                checked={newContextInjected}
                onChange={(event) =>
                  setNewContextInjected(event.target.checked)
                }
                className="size-4 accent-[#6aa7ff]"
              />
              Inject
            </label>
            <button
              type="button"
              onClick={createContextFile}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[6px] border border-[#31553a] px-3 text-xs font-semibold text-[#78d16d] transition-colors hover:bg-[#172219]"
            >
              <PlusIcon className="size-4" weight="bold" />
              Add
            </button>
          </div>

          {contextError && (
            <p className="mb-4 rounded-[6px] border border-[#5c3434] bg-[#211719] px-3 py-2 text-xs font-semibold text-[#f26d6d]">
              {contextError}
            </p>
          )}

          <div className="space-y-3">
            {contextFiles.map((file) => {
              const isEditing = editingContextPath === file.path;

              return (
                <div
                  key={file.path}
                  className="rounded-[7px] border border-[#24262b] bg-[#111214] p-3"
                >
                  {isEditing ? (
                    <div className="grid gap-3 lg:grid-cols-[1fr_1.3fr_auto_auto] lg:items-center">
                      <input
                        value={draftContextPath}
                        onChange={(event) =>
                          setDraftContextPath(event.target.value)
                        }
                        className={cn(taskFormFieldClass, 'h-9')}
                      />
                      <input
                        value={draftContextPurpose}
                        onChange={(event) =>
                          setDraftContextPurpose(event.target.value)
                        }
                        className={cn(taskFormFieldClass, 'h-9')}
                      />
                      <label className="flex h-9 items-center gap-2 rounded-[6px] border border-[#2a2c31] bg-[#17181b] px-3 text-xs font-semibold text-[#cfd2da]">
                        <input
                          type="checkbox"
                          checked={draftContextInjected}
                          onChange={(event) =>
                            setDraftContextInjected(event.target.checked)
                          }
                          className="size-4 accent-[#6aa7ff]"
                        />
                        Inject
                      </label>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={saveContextFile}
                          className="inline-flex size-9 items-center justify-center rounded-[6px] border border-[#31553a] text-[#78d16d] transition-colors hover:bg-[#172219]"
                          aria-label="Save context file"
                        >
                          <CheckCircleIcon className="size-4" weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setContextError('');
                            setEditingContextPath(null);
                          }}
                          className="inline-flex size-9 items-center justify-center rounded-[6px] border border-[#2a2c31] text-[#9ca1ad] transition-colors hover:bg-[#202227]"
                          aria-label="Cancel context file edit"
                        >
                          <XIcon className="size-4" weight="bold" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate font-ibm-plex-mono text-sm font-semibold text-[#dce0e8]">
                            {file.path}
                          </p>
                          <span
                            className={cn(
                              'rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                              file.injected
                                ? 'border-[#31553a] text-[#78d16d]'
                                : 'border-[#2a2c31] text-[#858b96]'
                            )}
                          >
                            {file.injected ? 'Injected' : 'Reference only'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-[#8d939f]">
                          {file.purpose}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateContextFile(file.path, {
                              ...file,
                              injected: !file.injected,
                            })
                          }
                          className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#2a2c31] px-3 text-xs font-semibold text-[#cfd2da] transition-colors hover:bg-[#202227]"
                        >
                          {file.injected ? (
                            <XIcon className="size-4" weight="bold" />
                          ) : (
                            <CheckCircleIcon className="size-4" weight="bold" />
                          )}
                          {file.injected ? 'Exclude' : 'Inject'}
                        </button>
                        <button
                          type="button"
                          onClick={() => startEditingContextFile(file)}
                          className="inline-flex size-9 items-center justify-center rounded-[6px] border border-[#2a2c31] text-[#9ca1ad] transition-colors hover:bg-[#202227]"
                          aria-label={`Edit ${file.path}`}
                        >
                          <PencilSimpleIcon className="size-4" weight="bold" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteContextFile(file.path);
                            if (editingContextPath === file.path) {
                              setEditingContextPath(null);
                            }
                          }}
                          className="inline-flex size-9 items-center justify-center rounded-[6px] border border-[#3b2a2d] text-[#f26d6d] transition-colors hover:bg-[#221719]"
                          aria-label={`Remove ${file.path}`}
                        >
                          <TrashIcon className="size-4" weight="bold" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center gap-3">
            <PlugsConnectedIcon
              className="size-5 text-[#858b96]"
              weight="bold"
            />
            <h2 className="text-lg font-semibold text-[#dce0e8]">Connectors</h2>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            {kavbanConnectorOrder.map((connectorId) => {
              const connector = connectors[connectorId];

              return (
                <ConnectorCard
                  key={connector.id}
                  connector={connector}
                  onToggle={onToggleConnector}
                />
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

function WorkspaceView({
  activeProjectId,
  connectors,
  onAddTaskComment,
  onAgentRoutingChange,
  onBriefChange,
  onCreateContextFile,
  onCreateAiReview,
  onCreateProject,
  onCreateTask,
  onDeleteContextFile,
  onDeleteTask,
  onMoveTask,
  onProjectTabChange,
  onOpenTaskPullRequest,
  onRecordHumanReview,
  onRecordRunCheck,
  onRepositoryChange,
  onSelectProject,
  onSelectTask,
  onStartAgentRun,
  onTaskViewChange,
  onToggleConnector,
  onUpdateContextFile,
  onUpdateTask,
  project,
  projectTab,
  projects,
  selectedTaskId,
  taskView,
}: {
  activeProjectId: string;
  connectors: Record<ConnectorId, Connector>;
  onAddTaskComment: (
    taskId: string,
    input: KavbanAddTaskCommentInput
  ) => boolean;
  onAgentRoutingChange: (input: KavbanAgentRoutingInput) => boolean;
  onBriefChange: (value: string) => void;
  onCreateContextFile: (input: KavbanContextFileInput) => boolean;
  onCreateAiReview: (taskId: string) => string | null;
  onCreateProject: (name: string) => void;
  onCreateTask: (input: KavbanCreateTaskInput) => string | null;
  onDeleteContextFile: (path: string) => boolean;
  onDeleteTask: (taskId: string) => boolean;
  onMoveTask: (taskId: string, status: TaskStatus) => boolean;
  onProjectTabChange: (tab: ProjectTab) => void;
  onOpenTaskPullRequest: (taskId: string) => string | null;
  onRecordHumanReview: (
    taskId: string,
    input: KavbanRecordHumanReviewInput
  ) => boolean;
  onRecordRunCheck: (
    taskId: string,
    runId: string,
    input: KavbanRecordRunCheckInput
  ) => boolean;
  onRepositoryChange: (input: KavbanRepositoryInput) => boolean;
  onSelectProject: (id: string) => void;
  onSelectTask: (id: string) => void;
  onStartAgentRun: (taskId: string) => string | null;
  onTaskViewChange: (view: TaskView) => void;
  onToggleConnector: (id: ConnectorId) => void;
  onUpdateContextFile: (path: string, input: KavbanContextFileInput) => boolean;
  onUpdateTask: (taskId: string, input: KavbanUpdateTaskInput) => boolean;
  project: Project;
  projectTab: ProjectTab;
  projects: Project[];
  selectedTaskId: string;
  taskView: TaskView;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar
        title={project.name}
        eyebrow="Workspace"
        rightSlot={
          <>
            <ProjectTabs
              activeTab={projectTab}
              onTabChange={onProjectTabChange}
            />
            <IconButton label="Workspace options" icon={DotsThreeIcon} />
          </>
        }
      />
      <div className="min-h-0 flex-1">
        {projectTab === 'home' && (
          <WorkspaceHome
            activeProjectId={activeProjectId}
            connectors={connectors}
            onCreateProject={onCreateProject}
            onSelectProject={onSelectProject}
            onTabChange={onProjectTabChange}
            project={project}
            projects={projects}
          />
        )}
        {projectTab === 'tasks' && (
          <WorkspaceTasks
            agentRouting={project.agentRouting ?? kavbanDefaultAgentRouting}
            contextFiles={project.contextFiles}
            onAddTaskComment={onAddTaskComment}
            onCreateAiReview={onCreateAiReview}
            onCreateTask={onCreateTask}
            onDeleteTask={onDeleteTask}
            onMoveTask={onMoveTask}
            onOpenTaskPullRequest={onOpenTaskPullRequest}
            onRecordHumanReview={onRecordHumanReview}
            onRecordRunCheck={onRecordRunCheck}
            onStartAgentRun={onStartAgentRun}
            onUpdateTask={onUpdateTask}
            projectName={project.name}
            taskView={taskView}
            onTaskViewChange={onTaskViewChange}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            tasks={project.tasks}
          />
        )}
        {projectTab === 'settings' && (
          <WorkspaceSettings
            agentRouting={project.agentRouting ?? kavbanDefaultAgentRouting}
            brief={project.brief}
            connectors={connectors}
            contextFiles={project.contextFiles}
            repository={project.repository}
            onAgentRoutingChange={onAgentRoutingChange}
            onBriefChange={onBriefChange}
            onCreateContextFile={onCreateContextFile}
            onDeleteContextFile={onDeleteContextFile}
            onRepositoryChange={onRepositoryChange}
            onToggleConnector={onToggleConnector}
            onUpdateContextFile={onUpdateContextFile}
          />
        )}
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="h-full overflow-y-auto bg-[#101113]">
      <TopBar title="Settings" eyebrow="App" />
      <div className="mx-auto grid max-w-5xl gap-4 px-6 py-7 md:grid-cols-2">
        {[
          {
            title: 'Agent routing',
            body: 'Codex handles backend, tests, intake, and review. Claude handles UI, product logic, docs, and long-context reasoning.',
            icon: CompassIcon,
          },
          {
            title: 'Merge safety',
            body: 'Main branch merges stay blocked until human approval is recorded for sensitive or production-bound work.',
            icon: ShieldCheckIcon,
          },
          {
            title: 'Local runtime',
            body: 'KAVBAN UI, orchestrator, workers, repos, and logs run locally first.',
            icon: TerminalIcon,
          },
          {
            title: 'Notifications',
            body: 'Task created, agent started, review completed, human needed, PR created, and blocked events are queued here.',
            icon: RocketIcon,
          },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <section
              key={item.title}
              className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5"
            >
              <Icon className="mb-4 size-5 text-[#858b96]" weight="bold" />
              <h2 className="text-base font-semibold text-[#dce0e8]">
                {item.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-[#8d939f]">
                {item.body}
              </p>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ProfileView({ profile }: { profile: Profile }) {
  return (
    <div className="h-full overflow-y-auto bg-[#101113]">
      <TopBar title={getProfileFirstName(profile)} eyebrow="Profile" />
      <div className="mx-auto max-w-4xl px-6 py-7">
        <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full border border-[#353841] bg-[#202227]">
              <UserCircleIcon className="size-7 text-[#cfd2da]" weight="bold" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#dce0e8]">
                {profile.displayName}
              </h2>
              <p className="text-sm text-[#858b96]">{profile.role}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Default agent', kavbanAgents[profile.defaultAgentId].name],
              ['Reviewer', kavbanAgents[profile.reviewerAgentId].name],
              ['Human gate', profile.humanGate],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-[7px] border border-[#24262b] bg-[#111214] p-4"
              >
                <p className="text-xs font-medium text-[#777d88]">{label}</p>
                <p className="mt-2 text-sm font-semibold text-[#dce0e8]">
                  {value}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export function KavbanDashboard() {
  const {
    activeProjectId,
    addTaskComment,
    createAiReview,
    createContextFile,
    createProject,
    createTask,
    deleteContextFile,
    deleteTask,
    inboxItems,
    moveTask,
    openTaskPullRequest,
    profile,
    project,
    projects,
    recordAgentRunCheck,
    recordHumanReview,
    selectProject,
    startAgentRun,
    updateAgentRouting,
    updateConnector,
    updateContextFile,
    updateProjectBrief,
    updateProjectRepository,
    updateTask,
  } = useKavbanLocalStore();
  const [activeSection, setActiveSection] = useState<AppSection>('workspace');
  const [projectTab, setProjectTab] = useState<ProjectTab>('tasks');
  const [taskView, setTaskView] = useState<TaskView>('board');
  const [selectedTaskId, setSelectedTaskId] = useState('kav-000123');
  const [selectedInboxId, setSelectedInboxId] = useState('inbox-1');

  useEffect(() => {
    if (
      project.tasks.length > 0 &&
      !project.tasks.some((task) => task.id === selectedTaskId)
    ) {
      setSelectedTaskId(project.tasks[0].id);
    }
  }, [project.tasks, selectedTaskId]);

  useEffect(() => {
    if (
      inboxItems.length > 0 &&
      !inboxItems.some((item) => item.id === selectedInboxId)
    ) {
      setSelectedInboxId(inboxItems[0].id);
    }
  }, [inboxItems, selectedInboxId]);

  const toggleConnector = (id: ConnectorId) => {
    updateConnector(id, (connector) => ({
      ...connector,
      connected: !connector.connected,
      status: connector.connected
        ? 'Needs auth'
        : id === 'github'
          ? `${project.repository.owner}/${project.repository.name}`
          : 'Ready',
    }));
  };

  return (
    <div className="dark h-screen w-screen overflow-hidden bg-[#08090a] p-3 font-ibm-plex-sans text-[#c9cdd6] md:p-8">
      <div className="flex h-full min-h-0 overflow-hidden rounded-[14px] border border-[#2b2e34] bg-[#111214] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:rounded-[22px]">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          profile={profile}
        />
        <main className="min-w-0 flex-1 overflow-hidden">
          {activeSection === 'inbox' && (
            <InboxView
              inboxItems={inboxItems}
              selectedInboxId={selectedInboxId}
              onSelectInbox={setSelectedInboxId}
              tasks={project.tasks}
            />
          )}
          {activeSection === 'workspace' && (
            <WorkspaceView
              activeProjectId={activeProjectId}
              connectors={project.connectors}
              onAddTaskComment={addTaskComment}
              onAgentRoutingChange={updateAgentRouting}
              onBriefChange={updateProjectBrief}
              onCreateAiReview={createAiReview}
              onCreateContextFile={createContextFile}
              onCreateProject={createProject}
              onCreateTask={createTask}
              onDeleteContextFile={deleteContextFile}
              onDeleteTask={deleteTask}
              onMoveTask={moveTask}
              onOpenTaskPullRequest={openTaskPullRequest}
              onProjectTabChange={setProjectTab}
              onRecordHumanReview={recordHumanReview}
              onRecordRunCheck={recordAgentRunCheck}
              onRepositoryChange={updateProjectRepository}
              onSelectProject={selectProject}
              onSelectTask={setSelectedTaskId}
              onStartAgentRun={startAgentRun}
              onTaskViewChange={setTaskView}
              onToggleConnector={toggleConnector}
              onUpdateContextFile={updateContextFile}
              onUpdateTask={updateTask}
              project={project}
              projectTab={projectTab}
              projects={projects}
              selectedTaskId={selectedTaskId}
              taskView={taskView}
            />
          )}
          {activeSection === 'settings' && <SettingsView />}
          {activeSection === 'profile' && <ProfileView profile={profile} />}
        </main>
      </div>
    </div>
  );
}
