import mongoose from "mongoose";

const newMemberSchema = new mongoose.Schema({
  number: {
    type: Number,
    unique: true,
  },
  day: String,
  date: Date,
  now:{
    type: Boolean,
    default: false
  },
  yesterday:{
    type: Boolean,
    default: false
  }
});

const NewMember = mongoose.model("NewMember", newMemberSchema);

export default NewMember;
