"use client";

import { useState, useEffect } from "react";
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Chip,
  Paper,
  Collapse,
  IconButton,
  Tooltip,
} from "@mui/material";
import { MessageSquare, Eye, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { hydrateTemplate, TemplateVariables } from "../../lib/utils/templateRenderer";

export interface WhatsAppTemplate {
  id: number;
  name: string;
  category: string;
  is_default: number;
  content: string;
  meta_template_name?: string;
  meta_status?: string;
}

interface WhatsAppTemplateSelectorProps {
  category: string;
  selectedTemplateId?: number | null;
  onSelectTemplate: (template: WhatsAppTemplate | null, hydratedContent: string) => void;
  variables?: TemplateVariables;
  size?: "small" | "medium";
  fullWidth?: boolean;
  approvedOnly?: boolean;
}

export default function WhatsAppTemplateSelector({
  category,
  selectedTemplateId,
  onSelectTemplate,
  variables = {},
  size = "small",
  fullWidth = true,
  approvedOnly = false,
}: WhatsAppTemplateSelectorProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<WhatsAppTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [category, approvedOnly, selectedTemplateId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      if (window.electron?.getWhatsAppTemplates) {
        const res = await window.electron.getWhatsAppTemplates(category);
        if (res.success && Array.isArray(res.templates)) {
          let list: WhatsAppTemplate[] = res.templates;

          if (approvedOnly) {
            const approvedList = list.filter((t) => t.meta_status === "APPROVED");
            if (approvedList.length > 0) {
              list = approvedList;
            }
          }

          setTemplates(list);

          // Select default or pre-selected
          let target: WhatsAppTemplate | null = null;
          if (selectedTemplateId) {
            target = list.find((t) => t.id === Number(selectedTemplateId)) || null;
          }
          if (!target) {
            target = list.find((t) => t.is_default === 1) || list[0] || null;
          }

          setActiveTemplate(target);
          if (target) {
            const hydrated = hydrateTemplate(target.content, variables);
            onSelectTemplate(target, hydrated);
          } else {
            onSelectTemplate(null, "");
          }
        }
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectionChange = (id: number) => {
    const found = templates.find((t) => t.id === id) || null;
    setActiveTemplate(found);
    if (found) {
      const hydrated = hydrateTemplate(found.content, variables);
      onSelectTemplate(found, hydrated);
    } else {
      onSelectTemplate(null, "");
    }
  };

  const getStatusChip = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return <Chip label="Approved" size="small" color="success" icon={<CheckCircle2 size={12} />} variant="outlined" />;
      case "PENDING":
        return <Chip label="Pending" size="small" color="warning" icon={<Clock size={12} />} variant="outlined" />;
      case "REJECTED":
        return <Chip label="Rejected" size="small" color="error" icon={<AlertCircle size={12} />} variant="outlined" />;
      default:
        return <Chip label="Local" size="small" color="default" variant="outlined" />;
    }
  };

  const hydratedPreview = activeTemplate ? hydrateTemplate(activeTemplate.content, variables) : "";

  return (
    <Box sx={{ width: "100%", my: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <FormControl fullWidth={fullWidth} size={size}>
          <InputLabel id="whatsapp-template-select-label">
            WhatsApp Template ({category.toUpperCase()})
          </InputLabel>
          <Select
            labelId="whatsapp-template-select-label"
            value={activeTemplate?.id || ""}
            label={`WhatsApp Template (${category.toUpperCase()})`}
            onChange={(e) => handleSelectionChange(Number(e.target.value))}
            disabled={loading || templates.length === 0}
          >
            {templates.map((tpl) => (
              <MenuItem key={tpl.id} value={tpl.id}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 2 }}>
                  <Typography variant="body2" sx={{ fontWeight: tpl.is_default ? 600 : 400 }}>
                    {tpl.name} {tpl.is_default === 1 && "★ (Default)"}
                  </Typography>
                  {getStatusChip(tpl.meta_status)}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {activeTemplate && (
          <Tooltip title={showPreview ? "Hide Live Message Preview" : "Preview Message Content"}>
            <IconButton
              size="small"
              color={showPreview ? "primary" : "default"}
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye size={18} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      <Collapse in={showPreview && !!activeTemplate}>
        <Paper
          variant="outlined"
          sx={{
            p: 1.5,
            mt: 1,
            borderRadius: 2,
            bgcolor: "#f4f6f8",
            borderLeft: "4px solid #25D366",
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            fontSize: "0.82rem",
            color: "#2c3e50",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <MessageSquare size={14} color="#25D366" />
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              HYDRATED MESSAGE PREVIEW
            </Typography>
          </Box>
          {hydratedPreview}
        </Paper>
      </Collapse>
    </Box>
  );
}
