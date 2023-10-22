import { PropsWithChildren } from "react";
import { Box } from "@mui/material";

export function Card(props: PropsWithChildren) {
  return (
    <Box
      sx={{
        borderLeft: "4px solid",
        borderColor: "primary.main",
        p: 2,
        boxShadow: 1,
        backgroundColor: "primary.constrastText",
      }}
    >
      {props.children}
    </Box>
  );
}
