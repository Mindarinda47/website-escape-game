import { describe, expect, it, vi } from "vitest";
import { createSimulation, stepSimulation } from "../pages/SportsPage";

describe("sports match simulation", () => {
  it("resets every player and gives kickoff to the team that conceded", () => {
    const random = vi.spyOn(Math, "random").mockReturnValue(0.5);
    try {
      const beforeGoal = createSimulation();
      beforeGoal.ball = { x: 99.5, y: 50, vx: 1, vy: 0 };
      beforeGoal.kickCooldown = 1;

      const afterGoal = stepSimulation(beforeGoal);
      const awayKickoffPlayer = afterGoal.players.find((player) => player.id === "a-3");

      expect(afterGoal.homeScore).toBe(1);
      expect(afterGoal.awayScore).toBe(0);
      expect(afterGoal.ball).toEqual({ x: 50, y: 50, vx: 0, vy: 0 });
      expect(awayKickoffPlayer).toMatchObject({ team: "away", x: 51, y: 50 });
      expect(afterGoal.restartDelay).toBeCloseTo(0.8);

      const waitingForKickoff = stepSimulation(afterGoal);
      expect(waitingForKickoff.players).toEqual(afterGoal.players);
      expect(waitingForKickoff.ball).toEqual(afterGoal.ball);
    } finally {
      random.mockRestore();
    }
  });
});
