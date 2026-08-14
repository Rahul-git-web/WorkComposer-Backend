import fs from "fs";
import path from "path";
import { Parser } from "json2csv";

export const generateAttendanceOverviewCSV = async (
  reportId,
  attendanceData,
) => {
  try {
    const fields = [
      "Employee",
      "Work Time",
      "Break Time",
      "Start Time",
      "Finish Time",
      "Sessions",
    ];

    const rows = attendanceData.map((user) => ({
      Employee: user.name,
      "Work Time": user.workTime,
      "Break Time": user.breakTime,
      "Start Time": user.startTime || "",
      "Finish Time": user.finishTime || "",
      Sessions: user.sessionsCount,
    }));

    const parser = new Parser({
      fields,
    });

    const csv = parser.parse(rows);

    const fileName = `attendance-overview-${reportId}.csv`;

    const filePath = path.join(process.cwd(), "uploads", "reports", fileName);

    fs.writeFileSync(filePath, csv);

    return {
      fileName,
      filePath,
    };
  } catch (err) {
    throw err;
  }
};

export const generateAttendanceDetailedCSV = async (reportId, rows) => {
  const reportsDir = path.join(process.cwd(), "uploads", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, {
      recursive: true,
    });
  }

  const fileName = `attendance-detailed-${reportId}.csv`;

  const filePath = path.join(reportsDir, fileName);

  const headers = [
    "Employee",
    "Date",
    "Start Time",
    "End Time",
    "Work Time",
    "Break Time",
    "Sessions",
  ];

  const csvRows = rows.map((row) =>
    [
      row.name,
      row.date,
      row.startTime,
      row.finishTime,
      row.workTime,
      row.breakTime,
      row.sessionsCount,
    ].join(","),
  );

  const csvContent = [headers.join(","), ...csvRows].join("\n");

  fs.writeFileSync(filePath, csvContent);

  return {
    fileUrl: `/uploads/reports/${fileName}`,
  };
};

export const generateProductivityCSV = async (reportId, rows) => {
  const reportsDir = path.join(process.cwd(), "uploads", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, {
      recursive: true,
    });
  }

  const fileName = `productivity-${reportId}.csv`;

  const filePath = path.join(reportsDir, fileName);

  const headers = [
    "Employee",
    "Productive Time",
    "Neutral Time",
    "Unproductive Time",
    "Total Tracked",
    "Productive %",
    "Neutral %",
    "Unproductive %",
  ];

  const csvRows = rows.map((row) =>
    [
      row.name,
      row.productiveTime,
      row.neutralTime,
      row.unproductiveTime,
      row.totalTracked,
      row.productivePercent,
      row.neutralPercent,
      row.unproductivePercent,
    ].join(","),
  );

  const csvContent = [headers.join(","), ...csvRows].join("\n");

  fs.writeFileSync(filePath, csvContent);

  return {
    fileUrl: `/uploads/reports/${fileName}`,
  };
};

export const generateProjectUserCSV = async (reportId, rows) => {
  const reportsDir = path.join(process.cwd(), "uploads", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, {
      recursive: true,
    });
  }

  const fileName = `project-user-${reportId}.csv`;

  const filePath = path.join(reportsDir, fileName);

  const headers = [
    "Employee",
    "Project",
    "Task",
    "Date",
    "Duration",
  ];

  const csvRows = rows.map((row) =>
    [
      row.user,
      row.project,
      row.task,
      row.date,
      row.duration,
    ].join(","),
  );

  const csvContent = [headers.join(","), ...csvRows].join("\n");

  fs.writeFileSync(filePath, csvContent);

  return {
    fileUrl: `/uploads/reports/${fileName}`,
  };
};

export const generateProjectCSV = async (reportId, rows) => {
  const reportsDir = path.join(process.cwd(), "uploads", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, {
      recursive: true,
    });
  }

  const fileName = `project-${reportId}.csv`;

  const filePath = path.join(reportsDir, fileName);

  const fields = [
    "Project",
    "Users",
    "Total Duration",
  ];

  const parser = new Parser({
    fields,
  });

  const csvRows = rows.map((row) => ({
    Project: row.project,
    Users: row.users,
    "Total Duration": row.totalDuration,
  }));

  const csv = parser.parse(csvRows);

  fs.writeFileSync(filePath, csv);

  return {
    fileUrl: `/uploads/reports/${fileName}`,
  };
};


export const generateTimeTrackingCSV = async (reportId, rows, type) => {
  const reportsDir = path.join(process.cwd(), "uploads", "reports");

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, {
      recursive: true,
    });
  }

  const fileName = `${type}-${reportId}.csv`;

  const filePath = path.join(reportsDir, fileName);

  const fields = [
    "Employee",
    "Date",
    "Start Time",
    "End Time",
    "Duration",
    "Type",
    "Project",
    "Task",
    "Reason",
  ];

  const parser = new Parser({
    fields,
  });

  const csv = parser.parse(
    rows.map((row) => ({
      Employee: row.employee,
      Date: row.date,
      "Start Time": row.startTime,
      "End Time": row.endTime,
      Duration: row.duration,
      Type: row.type,
      Project: row.project,
      Task: row.task,
      Reason: row.reason,
    })),
  );

  fs.writeFileSync(filePath, csv);

  return {
    fileUrl: `/uploads/reports/${fileName}`,
  };
};
