import { useState, useCallback } from "react";
import { leadsService, projectsService, monitorsService } from "../services/pipeline";
import toast from "react-hot-toast";

export function useLeads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (status) => {
    setLoading(true);
    try {
      const data = await leadsService.list(status);
      setLeads(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (body) => {
    const lead = await leadsService.create(body);
    setLeads((prev) => [lead, ...prev]);
    toast.success("Lead added to pipeline");
    return lead;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await leadsService.update(id, body);
    setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await leadsService.remove(id);
    setLeads((prev) => prev.filter((l) => l.id !== id));
    toast.success("Lead removed");
  }, []);

  return { leads, loading, load, create, update, remove };
}

export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await projectsService.list();
      setProjects(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (body) => {
    const project = await projectsService.create(body);
    setProjects((prev) => [project, ...prev]);
    toast.success("Project created");
    return project;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await projectsService.update(id, body);
    setProjects((prev) => prev.map((p) => (p.id === id ? updated : p)));
    return updated;
  }, []);

  return { projects, loading, load, create, update };
}

export function useMonitors() {
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await monitorsService.list();
      setMonitors(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (body) => {
    try {
      const monitor = await monitorsService.create(body);
      setMonitors((prev) => [...prev, monitor]);
      toast.success("Monitor created");
      return monitor;
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403) {
        toast.error(detail || "Monitor limit reached. Upgrade to Pro.");
      } else {
        toast.error(detail || "Failed to create monitor.");
      }
      throw err;
    }
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await monitorsService.update(id, body);
    setMonitors((prev) => prev.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await monitorsService.remove(id);
    setMonitors((prev) => prev.filter((m) => m.id !== id));
    toast.success("Monitor removed");
  }, []);

  return { monitors, loading, load, create, update, remove };
}
