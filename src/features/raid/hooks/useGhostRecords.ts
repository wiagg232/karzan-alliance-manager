import { useState, useCallback } from 'react';
import { supabase } from '@/shared/api/supabase';

export function useGhostRecords() {
  const [ghostRecords, setGhostRecords] = useState<Record<string, any[]>>({});

  const fetchGhostRecords = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ghost_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;

      const map: Record<string, any[]> = {};
      if (data) {
        data.forEach(record => {
          if (!map[record.member_id]) map[record.member_id] = [];
          map[record.member_id].push(record);
        });
      }
      setGhostRecords(map);
    } catch (err) {
      console.error('Error fetching ghost records:', err);
    }
  }, []);

  const handleAddGhostRecord = useCallback(async (memberId: string, seasonNumber?: number) => {
    try {
      const { data, error } = await supabase
        .from('ghost_records')
        .insert([{ member_id: memberId, season_number: seasonNumber }])
        .select();
      if (error) throw error;
      if (data && data.length > 0) {
        setGhostRecords(prev => ({
          ...prev,
          [memberId]: [data[0], ...(prev[memberId] || [])]
        }));
      }
    } catch (err) {
      console.error('Error adding ghost record:', err);
    }
  }, []);

  const handleDeleteGhostRecord = useCallback(async (memberId: string, record: any) => {
    try {
      let query = supabase.from('ghost_records').delete();

      if (record.id) {
        query = query.eq('id', record.id);
      } else if (record.uid) {
        query = query.eq('uid', record.uid);
      } else if (record.created_at) {
        query = query.eq('member_id', memberId).eq('created_at', record.created_at);
      } else {
        console.error('Cannot delete ghost record: no unique identifier found');
        return;
      }

      const { error } = await query;
      if (error) throw error;

      setGhostRecords(prev => ({
        ...prev,
        [memberId]: (prev[memberId] || []).filter(r => {
          if (record.id) return r.id !== record.id;
          if (record.uid) return r.uid !== record.uid;
          return r.created_at !== record.created_at;
        })
      }));
    } catch (err) {
      console.error('Error deleting ghost record:', err);
    }
  }, []);

  return {
    ghostRecords,
    fetchGhostRecords,
    handleAddGhostRecord,
    handleDeleteGhostRecord
  };
}
