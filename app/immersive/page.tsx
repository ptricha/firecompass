import { redirect } from "next/navigation";

// The 3D environments now live inside /simulator and /lab; old links keep working.
export default function ImmersiveRedirect() {
  redirect("/simulator");
}
