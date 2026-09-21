"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Stack,
  Typography,
  LinearProgress,
  Box,
  Alert,
} from "@mui/material";
import { MessageCircle, Send, Users } from "lucide-react";
import toast from "react-hot-toast";
import { hydrateTemplate } from "../../lib/utils/templateRenderer";

const { electron } = window;

const TEMPLATES = [
  {
    id: "miss_you",
    label: "We Miss You (Discount)",
    text: "Hello {{Name}}! 👋\n\nIt's been a while since we saw you at {{ShopName}}. We miss you!\n\nAs a special gift, here is a 5% discount on your next purchase. Valid for 7 days.\n\nSee you soon!",
  },
  {
    id: "new_stock",
    label: "New Arrivals",
    text: "Hi {name}! 🛍️\n\nJust wanted to let you know we have some exciting new stock in store that matches your taste.\n\nDrop by to check it out!",
  },
  {
    id: "feedback",
    label: "Feedback Request",
    text: "Namaste {name}, thank you for being a valued customer. 🙏\n\nHow was your experience with us? We would love to hear your thoughts.",
  },
  {
    id: "sale_alert",
    label: "Sale Alert",
    text: "Big News {name}! 📣\n\nOur End of Season Sale starts tomorrow. Up to 50% OFF on select items.\n\nDon't miss out!",
  },
  {
    id: "account_status",
    label: "Account Status Update",
    text: "Hello {name}, this is a gentle reminder regarding your account. Please check your latest statement for details. Let us know if you have any questions.",
  },
];

// Minimal interface required for sending messages
// This allows both CustomerInsight and CustomerFinancialRow to be passed in
export interface WhatsAppRecipient {
  name: string;
  phone: string;
  [key: string]: any; // Allow other properties to exist
}

interface Props {
  open: boolean;
  onClose: () => void;
  recipients: WhatsAppRecipient[];
}

export default function WhatsAppTemplateModal({
  open,
  onClose,
  recipients,
}: Props) {
  const [templateList, setTemplateList] = useState<any[]>(TEMPLATES);
  const [selectedTemplate, setSelectedTemplate] = useState<string>(TEMPLATES[0].id);
  const [messageBody, setMessageBody] = useState<string>(TEMPLATES[0].text);
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [sentCount, setSentCount] = useState(0);

  useEffect(() => {
    if (open) {
      setIsSending(false);
      setProgress(0);
      setSentCount(0);

      // Load DB Templates dynamically
      if (electron?.getWhatsAppTemplates) {
        electron.getWhatsAppTemplates().then((res: any) => {
          if (res.success && res.templates && res.templates.length > 0) {
            const formatted = res.templates.map((t: any) => ({
              id: String(t.id),
              label: `${t.name} (${t.category})`,
              text: t.content,
            }));
            setTemplateList(formatted);
            setSelectedTemplate(formatted[0].id);
            setMessageBody(formatted[0].text);
          }
        });
      }
    }
  }, [open]);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplate(id);
    const template = templateList.find((t) => String(t.id) === String(id));
    if (template) setMessageBody(template.text);
  };

  const handleSend = async () => {
    if (!messageBody.trim()) return toast.error("Message cannot be empty");

    setIsSending(true);
    setProgress(0);
    setSentCount(0);

    let successCount = 0;
    let failCount = 0;
    let lastErrorMsg = "";

    // Loop through all recipients
    for (let i = 0; i < recipients.length; i++) {
      const customer = recipients[i];

      // Update Progress UI
      const currentPercent = Math.round(((i + 1) / recipients.length) * 100);
      setProgress(currentPercent);

      if (customer.phone) {
        // 1. Personalize Message using templateRenderer
        const personalizedMessage = hydrateTemplate(messageBody, {
          Name: customer.name,
          CustomerName: customer.name,
          Total: customer.pending_amount || customer.total_amount || 0,
          ...customer,
        });

        // 2. Send via Electron IPC
        try {
          const res = await electron.sendWhatsAppMessage(
            customer.phone,
            personalizedMessage,
            "marketing"
          );
          if (res && res.success) {
            successCount++;
          } else {
            failCount++;
            if (res && res.error) lastErrorMsg = res.error;
          }
        } catch (e: any) {
          failCount++;
          lastErrorMsg = e.message;
        }
      } else {
        failCount++;
      }

      setSentCount(i + 1);

      // 3. Small delay to prevent spam flagging (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    setIsSending(false);

    if (successCount > 0) {
      toast.success(`Sent ${successCount} message(s) successfully!`);
      onClose();
    } else {
      toast.error(`Failed to send: ${lastErrorMsg || "Check connection or configuration."}`);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!isSending ? onClose : undefined}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <MessageCircle color="#25D366" />
          <Typography variant="h6">
            Send Message to {recipients.length} Customer
            {recipients.length !== 1 ? "s" : ""}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {isSending ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography variant="h6" gutterBottom>
                Sending Campaign...
              </Typography>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 10, borderRadius: 5, mb: 2 }}
              />
              <Typography variant="body2" color="text.secondary">
                Processed {sentCount} of {recipients.length} customers
              </Typography>
            </Box>
          ) : (
            <>
              <TextField
                select
                label="Choose Template"
                fullWidth
                size="small"
                value={selectedTemplate}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {templateList.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                label="Message Body"
                multiline
                rows={6}
                fullWidth
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                helperText="Use {name} to automatically insert the customer's name."
              />

              <Alert severity="info" icon={<Users size={18} />}>
                This will be sent to{" "}
                <strong>{recipients.length} customer{recipients.length !== 1 ? "s" : ""}</strong> via your active WhatsApp Provider.
              </Alert>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" disabled={isSending}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          color="success"
          startIcon={<Send size={18} />}
          disabled={isSending || recipients.length === 0}
        >
          {isSending ? "Sending..." : "Send Broadcast"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
