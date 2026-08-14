export const weeklyTeamTrackingReportTemplate = ({
  manager,
  reports,
  startDate,
  endDate,
}) => {
  return `
<!DOCTYPE html>
<html>

<body style="font-family:Arial,sans-serif;">

<h2>Daily Team Tracking Report</h2>

<p>Hello ${manager.firstName},</p>

<p>Here is your team's tracking summary for ${startDate} - ${endDate}.</p>

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
