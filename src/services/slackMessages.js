export const buildTaskAssignedMessage = ({
  taskId,
  title,
  project,
  assignedTo,
  priority,
  status,
  dueDate,
  createdBy,
}) => {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📋 New Task Assigned",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Task*\n${title}`,
        },
        {
          type: "mrkdwn",
          text: `*Project*\n${project}`,
        },
        {
          type: "mrkdwn",
          text: `*Assigned To*\n${assignedTo}`,
        },
        {
          type: "mrkdwn",
          text: `*Priority*\n${priority.toUpperCase()}`,
        },
        {
          type: "mrkdwn",
          text: `*Status*\n${status.toUpperCase()}`,
        },
        {
          type: "mrkdwn",
          text: `*Due Date*\n${
            dueDate ? new Date(dueDate).toLocaleDateString() : "Not set"
          }`,
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Created by *${createdBy}*`,
        },
      ],
    },

    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: {
            type: "plain_text",
            text: "Open Task",
            emoji: true,
          },
          url: `${process.env.FRONTEND_URL}/dashboard/task-management?task=${taskId}`,
        },
      ],
    },
  ];
};

export const buildTaskUpdatedMessage = ({ title, updatedBy, changes }) => {
  const fields = [
    {
      type: "mrkdwn",
      text: `*Task*\n${title}`,
    },
  ];

  changes.forEach((change) => {
    fields.push({
      type: "mrkdwn",
      text: `*${change.field}*\n${change.oldValue} → ${change.newValue}`,
    });
  });

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✏️ Task Updated",
      },
    },
    {
      type: "section",
      fields,
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Updated by *${updatedBy}*`,
        },
      ],
    },
  ];
};

export const buildTaskReassignedMessage = ({
  title,
  previousAssignee,
  newAssignee,
  reassignedBy,
}) => {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "👤 Task Reassigned",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Task*\n${title}`,
        },
        {
          type: "mrkdwn",
          text: `*From*\n${previousAssignee || "Unassigned"}`,
        },
        {
          type: "mrkdwn",
          text: `*To*\n${newAssignee || "Unassigned"}`,
        },
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Reassigned by *${reassignedBy}*`,
        },
      ],
    },
  ];
};

export const buildTaskCompletedMessage = ({
  title,
  completedBy,
  completedAt,
}) => {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "✅ Task Completed",
      },
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*Task*\n${title}`,
        },
        {
          type: "mrkdwn",
          text: `*Completed By*\n${completedBy}`,
        },
        {
          type: "mrkdwn",
          text: `*Completed On*\n${completedAt}`,
        },
      ],
    },
  ];
};

export const buildDailySummaryMessage = ({
  date,
  tasksCreated,
  tasksCompleted,
  activeUsers,
  totalWorkTime,
  totalBreakTime,
  topPerformer,
}) => {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📊 Daily Work Summary",
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Date:* ${date}`,
      },
    },
    {
      type: "divider",
    },
    {
      type: "section",
      fields: [
        {
          type: "mrkdwn",
          text: `*📝 Tasks Created*\n${tasksCreated}`,
        },
        {
          type: "mrkdwn",
          text: `*✅ Tasks Completed*\n${tasksCompleted}`,
        },
        {
          type: "mrkdwn",
          text: `*👥 Active Users*\n${activeUsers}`,
        },
        {
          type: "mrkdwn",
          text: `*⏱ Work Time*\n${totalWorkTime}`,
        },
        {
          type: "mrkdwn",
          text: `*☕ Break Time*\n${totalBreakTime}`,
        },
      ],
    },
    {
      type: "divider",
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: topPerformer
          ? `🏆 *Top Performer*\n*${topPerformer.name}*\n${topPerformer.workTime}`
          : "🏆 *Top Performer*\nNo work recorded today.",
      },
    },
  ];
};

export const buildWeeklySummaryMessage = ({
  startDate,
  endDate,
  tasksCreated,
  tasksCompleted,
  activeUsers,
  totalWorkTime,
  totalBreakTime,
  topPerformer,
}) => {
  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "📊 Weekly Work Summary",
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Period:* ${startDate} - ${endDate}`,
      },
    },

    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `*📌 Tasks Created:* ${tasksCreated}\n` +
          `*✅ Tasks Completed:* ${tasksCompleted}\n` +
          `*👥 Active Users:* ${activeUsers}\n` +
          `*⏱️ Total Work Time:* ${totalWorkTime}\n` +
          `*☕ Total Break Time:* ${totalBreakTime}`,
      },
    },

    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: topPerformer
          ? `*🏆 Top Performer*\n${topPerformer.name} (${topPerformer.workTime})`
          : "*🏆 Top Performer*\nNo work sessions recorded this week.",
      },
    },

    {
      type: "divider",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: "Generated automatically by WorkComposer",
        },
      ],
    },
  ];
};
