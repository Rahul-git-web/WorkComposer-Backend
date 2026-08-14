import mongoose from "mongoose";

const billingProfileSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },

    companyName: {
      type: String,
      default: "",
    },

    contactName: {
      type: String,
      default: "",
    },

    email: {
      type: String,
      default: "",
    },

    address: {
      type: String,
      default: "",
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    postalCode: {
      type: String,
      default: "",
    },

    country: {
      type: String,
      default: "",
    },

    taxId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("BillingProfile", billingProfileSchema);
