"use client";

import { Avatar, Button, Stack } from "@mui/material";
import { Image as ImageIcon, Trash2 } from "lucide-react";
import toast from "react-hot-toast";

const { ipcRenderer } = window.electron || {};

interface Props {
  currentLogo: string | null | undefined;
  onLogoSelect: (fileName: string | null) => void;
}

const LogoPicker = ({ currentLogo, onLogoSelect }: Props) => {
  const handleSelectClick = async () => {
    const toastId = toast.loading("Opening file dialog...");
    try {
      if (!ipcRenderer) throw new Error("IPC not available");

      const result = await ipcRenderer.invoke("select-logo");
      toast.dismiss(toastId);

      if (result.success) {
        onLogoSelect(result.fileName);
        toast.success("Logo updated!");
      } else {
        toast("No logo selected.");
      }
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error("Failed to select logo:", err);
      toast.error(err.message || "Could not select logo.");
    }
  };

  const handleRemoveClick = () => {
    onLogoSelect(null);
    toast.success("Logo removed.");
  };

  return (
    <Stack spacing={2} alignItems="center">
      <Avatar
        src={currentLogo || undefined}
        variant="rounded"
        sx={{
          width: 150,
          height: 150,
          fontSize: "4rem",
          backgroundColor: "grey.200",
          color: "grey.500",
          // ✅ THIS IS THE FIX: Forces the image to fit entirely inside the box without cropping
          "& .MuiAvatar-img": {
            objectFit: "contain",
          },
        }}
      >
        {!currentLogo && <ImageIcon />}
      </Avatar>

      <Stack direction="row" spacing={1}>
        <Button variant="outlined" size="small" onClick={handleSelectClick}>
          {currentLogo ? "Change Logo" : "Upload Logo"}
        </Button>

        {currentLogo && (
          <Button
            variant="text"
            color="error"
            size="small"
            onClick={handleRemoveClick}
            startIcon={<Trash2 size={16} />}
          >
            Remove
          </Button>
        )}
      </Stack>
    </Stack>
  );
};

export default LogoPicker;
