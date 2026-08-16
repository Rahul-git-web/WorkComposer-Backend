export const dailyOrganizationTrackingReportTemplate = ({
  owner,
  reports,
  date,
}) => {
  return `
<!DOCTYPE html>
<html>

<body style="font-family:Arial,sans-serif;">

<h2>Daily Organization Tracking Report</h2>

<p>Hello ${owner.firstName},</p>

<p>Here is your organization's tracking summary for ${date}.</p>

<table
  border="1"
  cellpadding="8"
  cellspacing="0"
  width="100%"
  style="border-collapse:collapse;"
>

<tr>
  <th align="left">Employee</th>
  <th>Attendance</th>
  <th>Worked</th>
  <th>Productivity</th>
</tr>

${reports}

</table>

</body>

</html>
`;
};