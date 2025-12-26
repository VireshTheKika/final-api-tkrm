import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

// 🔒 Scopes we need for managing calendar events
const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const oAuth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

/**
 * 📅 Adds a task as an event to Google Calendar
 * @param {Object} task - The task object
 * @param {string} task.title - Title of the task
 * @param {string} task.description - Description of the task
 * @param {Date} task.deadline - Deadline date
 * @param {Object} task.assignedUser - The user assigned to the task
 */
export const addEventToCalendar = async (task) => {
  if (!task.deadline) {
    console.log("⚠️ No deadline set — skipping calendar event creation");
    return null;
  }

  const calendar = google.calendar({ version: "v3", auth: oAuth2Client });

  const event = {
    summary: task.title,
    description: task.description || "No description provided.",
    start: {
      dateTime: new Date(task.deadline).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    end: {
      dateTime: new Date(
        new Date(task.deadline).getTime() + 60 * 60 * 1000 
      ).toISOString(),
      timeZone: "Asia/Kolkata",
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 30 },
        { method: "popup", minutes: 10 },
      ],
    },
  };

  try {
    const response = await calendar.events.insert({
      calendarId: "primary",
      resource: event,
    });

    console.log(" Event added to calendar:", response.data.htmlLink);
    return response.data.htmlLink;
  } catch (error) {
    console.error("❌ Failed to add event to Google Calendar:", error.message);
    if (error.response?.data) {
      console.error("Google API error:", error.response.data);
    }
    return null;
  }
};
