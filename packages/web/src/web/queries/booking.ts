import { useQuery, useMutation } from '@tanstack/react-query';
import { orpc } from '../lib/api';
export function useAvailability(input:{date:string;service:'cabelo'|'barba'|'combo';barber:'any'|'Lucas'|'Rafael'|'Diego'}) {return useQuery(orpc.booking.availability.queryOptions({input,refetchInterval:15000}));}
export function useBooking(){return useMutation(orpc.booking.create.mutationOptions());}
