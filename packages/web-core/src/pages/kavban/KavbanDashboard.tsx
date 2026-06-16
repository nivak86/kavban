import { useMemo, useState, type ComponentType } from 'react';
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
  PlugsConnectedIcon,
  PlusIcon,
  RobotIcon,
  RocketIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
  TerminalIcon,
  TrayIcon,
  UserCircleIcon,
  UserIcon,
} from '@phosphor-icons/react';
import { cn } from '@/shared/lib/utils';
import {
  kavbanAgents,
  kavbanConnectorOrder,
  kavbanInboxItems,
  kavbanProfile,
  kavbanProject,
} from './model';
import type {
  KavbanAgent as Agent,
  KavbanConnector as Connector,
  KavbanConnectorId as ConnectorId,
  KavbanInboxKind,
  KavbanTag as Tag,
  KavbanTask as Task,
  KavbanTaskStatus as TaskStatus,
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

const workflowColumns = kavbanProject.workflowColumns;
const initialTasks = kavbanProject.tasks;
const inboxItems = kavbanInboxItems;
const startingConnectors = kavbanProject.connectors;
const projectBrief = kavbanProject.brief;
const profileFirstName =
  kavbanProfile.displayName.split(' ')[0] || kavbanProfile.displayName;

const getTaskAgent = (task: Task) => kavbanAgents[task.agentId];
const getTaskReviewer = (task: Task) => kavbanAgents[task.reviewerId];
const getTaskActivity = (task: Task) =>
  task.events.map((event) => event.summary);

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
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[5px] border border-[#2a2c31] bg-[#25272b] px-2 text-xs font-medium text-[#cfd2da]">
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
    <span className="inline-flex h-6 items-center gap-1.5 rounded-[5px] border border-[#2a2c31] bg-[#25272b] px-2 text-xs font-medium text-[#cfd2da]">
      <GitPullRequestIcon className="size-3.5 text-[#58b957]" weight="bold" />
      {value}
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
}: {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
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
          {profileFirstName}
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
  selectedInboxId,
  onSelectInbox,
}: {
  selectedInboxId: string;
  onSelectInbox: (id: string) => void;
}) {
  const selected = inboxItems.find((item) => item.id === selectedInboxId);
  const task = initialTasks.find((item) => item.key === selected?.taskKey);

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
  connectors,
  onTabChange,
}: {
  connectors: Record<ConnectorId, Connector>;
  onTabChange: (tab: ProjectTab) => void;
}) {
  const stats = [
    { label: 'Ready', value: '1', icon: LightningIcon, color: '#f2d14b' },
    { label: 'Running', value: '1', icon: CircleIcon, color: '#f2d14b' },
    { label: 'In review', value: '2', icon: MagicWandIcon, color: '#6aa7ff' },
    {
      label: 'Human gates',
      value: '1',
      icon: ShieldCheckIcon,
      color: '#f26d6d',
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#101113] px-6 py-7">
      <div className="mx-auto max-w-6xl">
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
                {kavbanProject.name}
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
            <p className="text-sm leading-7 text-[#9aa0aa]">{projectBrief}</p>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {kavbanProject.contextFiles.map((file) => (
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
        'group w-full rounded-[8px] border bg-[#1b1d20] p-4 text-left shadow-[0_8px_22px_rgba(0,0,0,0.18)] transition-colors hover:border-[#343741]',
        selected ? 'border-[#444956]' : 'border-[#24262b]'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-ibm-plex-mono text-xs text-[#6f7682]">
            {task.key}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <StatusIcon task={task} />
            <h3 className="truncate text-sm font-medium text-[#d7d9df]">
              {task.title}
            </h3>
          </div>
        </div>
        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-[#2a2c31] bg-[#17181b] px-2.5 text-xs font-medium text-[#9ca1ad]">
          {task.state}
          <AgentAvatar agent={getTaskAgent(task)} />
        </span>
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-1.5">
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
  selectedTaskId,
  onSelectTask,
}: {
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
}) {
  const tasksByStatus = useMemo(
    () =>
      workflowColumns.reduce<Record<TaskStatus, Task[]>>(
        (acc, column) => {
          acc[column.id] = initialTasks.filter(
            (task) => task.status === column.id
          );
          return acc;
        },
        {} as Record<TaskStatus, Task[]>
      ),
    []
  );

  return (
    <div className="min-w-[1320px] px-6 py-7">
      <div className="grid grid-cols-6 gap-4">
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
                <IconButton
                  label={`Add task to ${column.label}`}
                  icon={PlusIcon}
                />
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
}: {
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
}) {
  return (
    <div className="min-w-[980px] px-6 py-7">
      <div className="space-y-1">
        {initialTasks.map((task) => (
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
              {task.tags.slice(0, 2).map((tag) => (
                <TagPill key={tag.label} tag={tag} />
              ))}
              <AgentAvatar agent={getTaskAgent(task)} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TaskDetailPanel({ task }: { task: Task }) {
  return (
    <aside className="hidden w-[380px] shrink-0 border-l border-[#24262b] bg-[#111214] xl:block">
      <div className="border-b border-[#24262b] px-5 py-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-ibm-plex-mono text-sm text-[#6f7682]">
            {task.key}
          </span>
          <IconButton label="Task options" icon={DotsThreeIcon} />
        </div>
        <h2 className="text-lg font-semibold text-[#dce0e8]">{task.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[#8d939f]">
          {task.description}
        </p>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="grid gap-3 text-sm">
          {[
            ['Status', task.state],
            ['Priority', task.priority],
            ['Agent', getTaskAgent(task).name],
            ['Reviewer', getTaskReviewer(task).name],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-[#777d88]">{label}</span>
              <span className="text-[#cfd2da]">{value}</span>
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
  taskView,
  onTaskViewChange,
  selectedTaskId,
  onSelectTask,
}: {
  taskView: TaskView;
  onTaskViewChange: (view: TaskView) => void;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
}) {
  const selectedTask =
    initialTasks.find((task) => task.id === selectedTaskId) ?? initialTasks[0];

  return (
    <div className="flex h-full min-h-0">
      <main className="min-w-0 flex-1 overflow-auto bg-[#101113]">
        <TopBar
          title="Tasks"
          eyebrow={kavbanProject.name}
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
              <IconButton label="New task" icon={PlusIcon} />
            </>
          }
        />
        {taskView === 'board' ? (
          <TasksBoard
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
        ) : (
          <TasksList
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
        )}
      </main>
      <TaskDetailPanel task={selectedTask} />
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
  brief,
  onBriefChange,
  connectors,
  onToggleConnector,
}: {
  brief: string;
  onBriefChange: (value: string) => void;
  connectors: Record<ConnectorId, Connector>;
  onToggleConnector: (id: ConnectorId) => void;
}) {
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
  projectTab,
  onProjectTabChange,
  taskView,
  onTaskViewChange,
  selectedTaskId,
  onSelectTask,
  brief,
  onBriefChange,
  connectors,
  onToggleConnector,
}: {
  projectTab: ProjectTab;
  onProjectTabChange: (tab: ProjectTab) => void;
  taskView: TaskView;
  onTaskViewChange: (view: TaskView) => void;
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  brief: string;
  onBriefChange: (value: string) => void;
  connectors: Record<ConnectorId, Connector>;
  onToggleConnector: (id: ConnectorId) => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <TopBar
        title={kavbanProject.name}
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
            connectors={connectors}
            onTabChange={onProjectTabChange}
          />
        )}
        {projectTab === 'tasks' && (
          <WorkspaceTasks
            taskView={taskView}
            onTaskViewChange={onTaskViewChange}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
          />
        )}
        {projectTab === 'settings' && (
          <WorkspaceSettings
            brief={brief}
            onBriefChange={onBriefChange}
            connectors={connectors}
            onToggleConnector={onToggleConnector}
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

function ProfileView() {
  return (
    <div className="h-full overflow-y-auto bg-[#101113]">
      <TopBar title={profileFirstName} eyebrow="Profile" />
      <div className="mx-auto max-w-4xl px-6 py-7">
        <section className="rounded-[8px] border border-[#24262b] bg-[#17181b] p-5">
          <div className="mb-6 flex items-center gap-4">
            <span className="flex size-12 items-center justify-center rounded-full border border-[#353841] bg-[#202227]">
              <UserCircleIcon className="size-7 text-[#cfd2da]" weight="bold" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-[#dce0e8]">
                {kavbanProfile.displayName}
              </h2>
              <p className="text-sm text-[#858b96]">{kavbanProfile.role}</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[
              [
                'Default agent',
                kavbanAgents[kavbanProfile.defaultAgentId].name,
              ],
              ['Reviewer', kavbanAgents[kavbanProfile.reviewerAgentId].name],
              ['Human gate', kavbanProfile.humanGate],
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
  const [activeSection, setActiveSection] = useState<AppSection>('workspace');
  const [projectTab, setProjectTab] = useState<ProjectTab>('tasks');
  const [taskView, setTaskView] = useState<TaskView>('board');
  const [selectedTaskId, setSelectedTaskId] = useState(initialTasks[2].id);
  const [selectedInboxId, setSelectedInboxId] = useState(inboxItems[0].id);
  const [brief, setBrief] = useState(projectBrief);
  const [connectors, setConnectors] =
    useState<Record<ConnectorId, Connector>>(startingConnectors);

  const toggleConnector = (id: ConnectorId) => {
    setConnectors((current) => ({
      ...current,
      [id]: {
        ...current[id],
        connected: !current[id].connected,
        status: current[id].connected
          ? 'Needs auth'
          : id === 'github'
            ? 'nivak86/kavban'
            : 'Ready',
      },
    }));
  };

  return (
    <div className="dark h-screen w-screen overflow-hidden bg-[#08090a] p-3 font-ibm-plex-sans text-[#c9cdd6] md:p-8">
      <div className="flex h-full min-h-0 overflow-hidden rounded-[14px] border border-[#2b2e34] bg-[#111214] shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:rounded-[22px]">
        <Sidebar
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <main className="min-w-0 flex-1 overflow-hidden">
          {activeSection === 'inbox' && (
            <InboxView
              selectedInboxId={selectedInboxId}
              onSelectInbox={setSelectedInboxId}
            />
          )}
          {activeSection === 'workspace' && (
            <WorkspaceView
              projectTab={projectTab}
              onProjectTabChange={setProjectTab}
              taskView={taskView}
              onTaskViewChange={setTaskView}
              selectedTaskId={selectedTaskId}
              onSelectTask={setSelectedTaskId}
              brief={brief}
              onBriefChange={setBrief}
              connectors={connectors}
              onToggleConnector={toggleConnector}
            />
          )}
          {activeSection === 'settings' && <SettingsView />}
          {activeSection === 'profile' && <ProfileView />}
        </main>
      </div>
    </div>
  );
}
