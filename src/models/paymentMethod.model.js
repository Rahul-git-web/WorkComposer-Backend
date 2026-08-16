import mongoose from "mongoose";

const paymentMethodSchema = new mongoose.Schema(
  {
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
    },

    brand: {
      type: String,
      default: "",
    },

    last4: {
      type: String,
      default: "",
    },

    expiryMonth: {
      type: Number,
    },

    expiryYear: {
      type: Number,
    },

    cardholderName: {
      type: String,
      default: "",
    },

    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("PaymentMethod", paymentMethodSchema);
