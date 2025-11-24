import { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { Send } from "lucide-react";
import toast from "react-hot-toast";

interface Props {
  sale: {
    reference_no: string;
    total_amount: number;
  };
  shopName: string;
  customerPhone?: string;
  customerName?: string;
}

export default function WhatsAppShareButton({
  sale,
  shopName,
  customerPhone,
  customerName,
}: Props) {
  const [sending, setSending] = useState(false);

  const handleShare = async () => {
    if (!customerPhone) return toast.error("No phone number found");

    // 1. Check if we are connected
    const wsStatus = await window.electron.getWhatsAppStatus();
    if (wsStatus.status !== "ready") {
      return toast.error("WhatsApp not connected. Please scan QR in Settings.");
    }

    setSending(true);
    const nl = "\n"; // Standard newline for automated messages
    const text =
      `*Invoice from ${shopName}*${nl}${nl}` +
      `Hello ${customerName},${nl}` +
      `Here is your bill details:${nl}` +
      `------------------------------${nl}` +
      `📄 Bill No: ${sale.reference_no}${nl}` +
      `📅 Date: ${new Date().toLocaleDateString("en-IN")}${nl}` +
      `💰 *Amount: ₹${sale.total_amount.toLocaleString("en-IN")}*${nl}` +
      `------------------------------${nl}` +
      `Thank you for your business!`;

    try {
      const res = await window.electron.sendWhatsAppMessage(
        customerPhone,
        text
      );
      if (res.success) {
        toast.success("Message sent automatically!");
      } else {
        toast.error("Failed to send: " + res.error);
      }
    } catch (e) {
      toast.error("Error sending message");
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      variant="outlined"
      color="success"
      startIcon={
        sending ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <Send size={18} />
        )
      }
      onClick={handleShare}
      disabled={!customerPhone || sending}
    >
      {sending ? "Sending..." : "Auto Send Invoice"}
    </Button>
  );
}
