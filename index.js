import {
  DisconnectReason,
  makeWASocket,
  useMultiFileAuthState,
  BufferJSON,
} from "@whiskeysockets/baileys";
import * as fs from "fs";
import moment from "moment";
import moments from "moment-timezone";

import express from "express";
const app = express();
import cors from "cors";

import mongoose from "mongoose";
import NewMember from "./newMember.js";

const connectDatabase = () => {
  mongoose
    .connect(
      "mongodb+srv://upskillmafia:upskillmafia694@upskillmafia.vdegzfy.mongodb.net/?retryWrites=true&w=majority"
    )
    .then((data) => {
      console.log(`Mongo db connected with server: ${data.connection.host}`);
    })
    .catch((err) => {
      console.log(err);
    });
};
connectDatabase();

const sendOtp = async (number, date) => {
  try {
    const response = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic MGRiYUtNMDNSRlFteUJ2VGJTSkVzTVhBNnl6X2sxX2phc2JldjU3OWhSUTo=",
      },
      body: JSON.stringify({
        countryCode: "+91",
        phoneNumber: number,
        type: "Template",
        template: {
          name: "onboard_new",
          languageCode: "en",
          bodyValues: [date],
        },
      }),
    });

    let day = "Tomorrow";
    if (date.includes("Today")) day = "Today";

    if (!response.ok) throw new Error("Something went Wrong");
    else {
      const newMemberDocument = new NewMember({
        number: number,
        date: new Date(),
        day: day,
      });

      newMemberDocument
        .save()
        .then((savedMember) => {})
        .catch((error) => {
          console.error("Error creating new member:", error);
        });
    }
  } catch (e) {
    console.log(e);
    throw e;
  }
};
const yesterdaymiss = async (number) => {
  try {
    const response = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic MGRiYUtNMDNSRlFteUJ2VGJTSkVzTVhBNnl6X2sxX2phc2JldjU3OWhSUTo=",
      },
      body: JSON.stringify({
        countryCode: "+91",
        phoneNumber: number,
        type: "Template",
        template: {
          name: "yesterday_miss",
          languageCode: "en",
        },
      }),
    });

    if (!response.ok) throw new Error("Something went Wrong");
  } catch (e) {
    console.log(e);
    throw e;
  }
};
const joinnow = async (number) => {
  try {
    const response = await fetch("https://api.interakt.ai/v1/public/message/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Basic MGRiYUtNMDNSRlFteUJ2VGJTSkVzTVhBNnl6X2sxX2phc2JldjU3OWhSUTo=",
      },
      body: JSON.stringify({
        countryCode: "+91",
        phoneNumber: number,
        type: "Template",
        template: {
          name: "join_now",
          languageCode: "en",
        },
      }),
    });

    if (!response.ok) throw new Error("Something went Wrong");
  } catch (e) {
    console.log(e);
    throw e;
  }
};
async function WABot() {
  const { state, saveCreds } = await useMultiFileAuthState("auth");
  const store = {};
  const getMessage = (key) => {
    const { id } = key;
    if (store[id]) return store[id].message;
  };
  const sock = makeWASocket({
    printQRInTerminal: true,
    auth: state,
    getMessage,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(
        "connection closed due to ",
        lastDisconnect.error,
        ", reconnecting ",
        shouldReconnect
      );

      if (shouldReconnect) {
        WABot();
      }
    }
  });
  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("messages.upsert", async ({ messages }) => {
    if (messages[0].messageStubType === 27) {
      const number = messages[0].messageStubParameters[0]
        .split("@")[0]
        .slice(2);

      // Create a moment object with the current time in Indian Standard Time (IST)
      let currentDateTime = moments().tz("Asia/Kolkata");

      if (currentDateTime.hours() < 19) {
        var generatedDate = formatDate(currentDateTime) + "(Today)";
      } else {
        currentDateTime.add(1, "day");
        var generatedDate = formatDate(currentDateTime) + "(Tomorrow)";
      }

      function formatDate(date) {
        return date.format("MMMM DD, YYYY");
      }

      try {
        await sendOtp(number, generatedDate);
      } catch (e) {
        console.log(e.message);
      }
    }
  });
}

WABot();

app.use(cors());
app.use(express.json());
app.get("/", (req, res) => {
  res.status(200).json({ success: true });
});
app.get("/new/join", async (req, res) => {
  const today = moment().startOf("day");
  const yesterday = moment().subtract(1, "day").startOf("day");
  const members = await NewMember.find({
    $or: [
      { date: { $gte: today.toDate() }, day: "Today", now: false },
      {
        date: { $gte: yesterday.toDate(), $lt: today.toDate() },
        day: "Tomorrow",
        now: false,
      },
    ],
  });
  members.forEach(async (member) => {
    try {
      await joinnow(member.number);
      member.now = true;

      await member.save();
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  });
  return res.status(200).json({ success: true, data: members });
});
app.get("/yesterday/join", async (req, res) => {
  const today = moment().startOf("day");
  const dayby = moment().subtract(2, "day").startOf("day");
  const yesterday = moment().subtract(1, "day").startOf("day");
  const members = await NewMember.find({
    $or: [
      {
        date: { $gte: dayby.toDate(), $lt: yesterday.toDate() },
        day: "Tomorrow",
        yesterday: false,
      },
      {
        date: { $gte: yesterday.toDate(), $lt: today.toDate() },
        day: "Today",
        yesterday: false,
      },
    ],
  });
  members.forEach(async (member) => {
    try {
      await yesterdaymiss(member.number);
      member.yesterday = true;

      await member.save();
    } catch (err) {
      return res.status(404).json({ error: err.message });
    }
  });
  return res.status(200).json({ success: true, data: members });
});
app.listen(4005, () => {
  console.log("Listening on port : http://localhost:" + 4005);
});
