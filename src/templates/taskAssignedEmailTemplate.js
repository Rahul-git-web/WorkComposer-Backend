const taskAssignedEmailTemplate = ({
  firstName,
  title,
  project,
  priority,
  status,
  dueDate,
  createdBy,
}) => {
  return `
    <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #e5e7eb; border-radius:8px; overflow:hidden;">
      
      <div style="background:#4f46e5; padding:20px; color:white;">
        <h2 style="margin:0;">New Task Assigned</h2>
      </div>

      <div style="padding:24px;">
        <p>Hi <strong>${firstName}</strong>,</p>

        <p>A new task has been assigned to you.</p>

        <table style="width:100%; border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;"><strong>Task</strong></td>
            <td>${title}</td>
          </tr>

          <tr>
            <td style="padding:8px 0;"><strong>Project</strong></td>
            <td>${project || "-"}</td>
          </tr>

          <tr>
            <td style="padding:8px 0;"><strong>Priority</strong></td>
            <td>${priority}</td>
          </tr>

          <tr>
            <td style="padding:8px 0;"><strong>Status</strong></td>
            <td>${status}</td>
          </tr>

          <tr>
            <td style="padding:8px 0;"><strong>Due Date</strong></td>
            <td>${dueDate || "-"}</td>
          </tr>

          <tr>
            <td style="padding:8px 0;"><strong>Assigned By</strong></td>
            <td>${createdBy}</td>
          </tr>
        </table>

        <p style="margin-top:30px;">
          Please log in to WorkComposer to review the task details.
        </p>
      </div>

      <div style="background:#f9fafb; padding:16px; text-align:center; color:#6b7280;">
        © WorkComposer
      </div>

    </div>
  `;
};

export default taskAssignedEmailTemplate;
