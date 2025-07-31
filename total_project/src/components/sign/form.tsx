"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiGithub, SiGoogle } from "react-icons/si";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleCredentialsSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(t("sign_modal.invalid_credentials"));
      } else {
        router.push("/");
        router.refresh();
      }
    } catch (error) {
      setError(t("sign_modal.signin_error"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">
            {t("sign_modal.sign_in_title")}
          </CardTitle>
          <CardDescription>
            {t("sign_modal.sign_in_description")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              {process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED === "true" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("google")}
                >
                  <SiGoogle className="w-4 h-4" />
                  {t("sign_modal.google_sign_in")}
                </Button>
              )}
              {process.env.NEXT_PUBLIC_AUTH_GITHUB_ENABLED === "true" && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => signIn("github")}
                >
                  <SiGithub className="w-4 h-4" />
                  {t("sign_modal.github_sign_in")}
                </Button>
              )}
            </div>

            {process.env.NEXT_PUBLIC_AUTH_CREDENTIALS_ENABLED !== "false" && (
              <>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-background px-2 text-muted-foreground">
                    {t("sign_modal.or_continue_with")}
                  </span>
                </div>
                <form onSubmit={handleCredentialsSignIn}>
                  <div className="grid gap-6">
                    {error && (
                      <div className="text-sm text-red-500 text-center">
                        {error}
                      </div>
                    )}
                    <div className="grid gap-2">
                      <Label htmlFor="identifier">
                        {t("sign_modal.email_or_username")}
                      </Label>
                      <Input
                        id="identifier"
                        type="text"
                        placeholder={t("sign_modal.email_or_username_placeholder")}
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">
                        {t("sign_modal.password")}
                      </Label>
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? t("sign_modal.signing_in") : t("sign_modal.sign_in")}
                    </Button>
                  </div>
                </form>
                <div className="text-center text-sm">
                  {t("sign_modal.no_account")}{" "}
                  <a href="/auth/register" className="underline underline-offset-4">
                    {t("sign_modal.sign_up")}
                  </a>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
      <div className="text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary  ">
        {t("sign_modal.terms_agreement")}{" "}
        <a href="/terms-of-service" target="_blank">
          {t("sign_modal.terms_of_service")}
        </a>{" "}
        {t("sign_modal.and")}{" "}
        <a href="/privacy-policy" target="_blank">
          {t("sign_modal.privacy_policy")}
        </a>
        .
      </div>
    </div>
  );
}
