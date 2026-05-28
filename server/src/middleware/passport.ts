import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { UserModel } from "../models/User.js";
import { config } from "../config.js";

if (config.googleClientId && config.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: config.googleClientId,
        clientSecret: config.googleClientSecret,
        callbackURL: config.googleCallbackUrl,
        scope: ["profile", "email"],
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value?.toLowerCase().trim();
          if (!email) return done(new Error("No email returned from Google"));

          let user = await UserModel.findOne({ $or: [{ googleId }, { email }] });

          if (user) {
            if (!user.googleId) {
              user.googleId = googleId;
              await user.save();
            }
          } else {
            user = await UserModel.create({
              email,
              googleId,
              familyMembers: [],
            });
          }

          return done(null, user);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

export default passport;
