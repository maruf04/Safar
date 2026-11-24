SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

CREATE FUNCTION public.delete_seat_reservations_for_ticket() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM seat_reservation WHERE ticket_id = OLD.ticket_id;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.delete_seat_reservations_for_ticket() OWNER TO postgres;

CREATE FUNCTION public.delete_tickets_for_passenger() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM ticket WHERE user_id = OLD.user_id;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.delete_tickets_for_passenger() OWNER TO postgres;

CREATE FUNCTION public.get_classes_by_train(p_train_code text) RETURNS TABLE(class_code text, class_name text, total_seat integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT s.class_code, c.class_name, s.total_seat
    FROM seat s
    JOIN class c ON (s.class_code = c.class_code)
    WHERE s.train_code = p_train_code;
END;
$$;

ALTER FUNCTION public.get_classes_by_train(p_train_code text) OWNER TO postgres;

CREATE FUNCTION public.get_possible_routes(p_from_city text, p_to_city text) RETURNS TABLE(route_id integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT rs1.route_id
    FROM route_station rs1
    JOIN station s1 ON rs1.station_id = s1.station_id
    WHERE s1.station_name = p_from_city
    INTERSECT
    SELECT rs2.route_id
    FROM route_station rs2
    JOIN station s2 ON rs2.station_id = s2.station_id
    WHERE s2.station_name = p_to_city;
END;
$$;

ALTER FUNCTION public.get_possible_routes(p_from_city text, p_to_city text) OWNER TO postgres;

CREATE FUNCTION public.get_route_sequence(p_route_id integer) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_order_of_stations TEXT;
BEGIN
    SELECT order_of_stations INTO v_order_of_stations
    FROM route 
    WHERE route_id = p_route_id;
    
    RETURN v_order_of_stations;
END;
$$;

ALTER FUNCTION public.get_route_sequence(p_route_id integer) OWNER TO postgres;

CREATE FUNCTION public.get_station_ids(p_from_city text, p_to_city text) RETURNS TABLE(station_id text, station_name text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT s.station_id, s.station_name 
    FROM station s
    WHERE s.station_name = p_from_city OR s.station_name = p_to_city;
END;
$$;

ALTER FUNCTION public.get_station_ids(p_from_city text, p_to_city text) OWNER TO postgres;

CREATE FUNCTION public.get_trains_by_route(p_route_id integer) RETURNS TABLE(train_code text, name text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN QUERY
    SELECT t.train_code, t.name 
    FROM train t
    WHERE t.route_id = p_route_id;
END;
$$;

ALTER FUNCTION public.get_trains_by_route(p_route_id integer) OWNER TO postgres;

CREATE FUNCTION public.get_unavailable_seats(p_train_code integer, p_from_station text, p_to_station text, p_date date) RETURNS TABLE(class_code integer, seat_number integer)
    LANGUAGE plpgsql
    AS $$
BEGIN
  RETURN QUERY
  WITH station_order_cte AS (
    SELECT string_to_array(r.order_of_stations, ' ') AS station_order
    FROM train t
    JOIN route r ON t.route_id = r.route_id
    WHERE t.train_code = p_train_code
  )
  SELECT
    sr.class_code,
    sr.seat_number
  FROM
    seat_reservation sr,
    station_order_cte soc
  WHERE
    sr.train_code = p_train_code
    AND sr.date = p_date
    AND (
      (
        array_position(soc.station_order, sr.from_station) <= array_position(soc.station_order, p_from_station)
        AND array_position(soc.station_order, p_from_station) <= array_position(soc.station_order, sr.to_station)
      )
      OR
      (
        array_position(soc.station_order, p_from_station) <= array_position(soc.station_order, sr.from_station)
        AND array_position(soc.station_order, sr.from_station) <= array_position(soc.station_order, p_to_station)
      )
    );
END;
$$;

ALTER FUNCTION public.get_unavailable_seats(p_train_code integer, p_from_station text, p_to_station text, p_date date) OWNER TO postgres;

CREATE FUNCTION public.handle_ticket_delete() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  DELETE FROM payment_history WHERE payment_id = OLD.ticket_id;
  RETURN OLD;
END;
$$;

ALTER FUNCTION public.handle_ticket_delete() OWNER TO postgres;

CREATE FUNCTION public.insert_payment_history_on_ticket() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO payment_history (payment_id, total_payment)
  VALUES (NEW.ticket_id, NEW.total_cost);
  RETURN NEW;
END;
$$;

ALTER FUNCTION public.insert_payment_history_on_ticket() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

CREATE TABLE public.admin (
    admin_id integer NOT NULL,
    name character varying NOT NULL,
    email character varying NOT NULL,
    salary integer NOT NULL,
    user_name character varying,
    password character varying
);

ALTER TABLE public.admin OWNER TO postgres;

CREATE TABLE public.class (
    class_code integer NOT NULL,
    class_name character varying(100) NOT NULL,
    cost_per_unit integer
);

ALTER TABLE public.class OWNER TO postgres;

CREATE TABLE public.distance_storage (
    from_station integer NOT NULL,
    to_station integer NOT NULL,
    distance_unit integer NOT NULL
);

ALTER TABLE public.distance_storage OWNER TO postgres;

CREATE TABLE public.layout (
    layout_id integer NOT NULL,
    class_code integer NOT NULL,
    train_code integer NOT NULL,
    version integer
);

ALTER TABLE public.layout OWNER TO postgres;

CREATE TABLE public.passenger (
    user_id integer NOT NULL,
    name character varying,
    phone_number integer,
    username character varying,
    password character varying
);

ALTER TABLE public.passenger OWNER TO postgres;

CREATE TABLE public.payment_history (
    payment_id integer NOT NULL,
    payment_method character varying,
    total_payment integer
);

ALTER TABLE public.payment_history OWNER TO postgres;

CREATE TABLE public.refund_history (
    refund_id integer NOT NULL,
    refund_method character varying,
    refund_date date
);

ALTER TABLE public.refund_history OWNER TO postgres;

CREATE TABLE public.route (
    route_id integer NOT NULL,
    route_name character varying NOT NULL,
    total_station integer,
    order_of_stations character varying
);

ALTER TABLE public.route OWNER TO postgres;

CREATE TABLE public.route_station (
    station_id integer NOT NULL,
    route_id integer NOT NULL
);

ALTER TABLE public.route_station OWNER TO postgres;

CREATE TABLE public.seat (
    total_seat integer NOT NULL,
    class_code integer NOT NULL,
    train_code integer NOT NULL
);

ALTER TABLE public.seat OWNER TO postgres;

CREATE TABLE public.seat_coordinate (
    layout_id integer NOT NULL,
    seat_name character varying NOT NULL,
    x_coordinate integer NOT NULL,
    y_coordinate integer NOT NULL
);

ALTER TABLE public.seat_coordinate OWNER TO postgres;

CREATE TABLE public.seat_reservation (
    ticket_id integer NOT NULL,
    seat_number integer NOT NULL,
    class_code integer NOT NULL,
    train_code integer NOT NULL,
    from_station character varying NOT NULL,
    to_station character varying NOT NULL,
    date date
);

ALTER TABLE public.seat_reservation OWNER TO postgres;

CREATE TABLE public.station (
    station_id integer NOT NULL,
    station_name character varying NOT NULL,
    location character varying,
    zone character varying,
    post_code integer
);

ALTER TABLE public.station OWNER TO postgres;

CREATE SEQUENCE public.ticket_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.ticket_id_seq OWNER TO postgres;

CREATE TABLE public.ticket (
    ticket_id integer DEFAULT nextval('public.ticket_id_seq'::regclass) NOT NULL,
    total_cost integer,
    user_id integer
);

ALTER TABLE public.ticket OWNER TO postgres;

CREATE TABLE public.time_table (
    train_code integer NOT NULL,
    station_id integer NOT NULL,
    arrival_time time without time zone NOT NULL,
    departure_time time without time zone NOT NULL,
    admin_id integer,
    route_id integer
);

ALTER TABLE public.time_table OWNER TO postgres;

CREATE TABLE public.train (
    train_code integer NOT NULL,
    name character varying NOT NULL,
    off_day character varying NOT NULL,
    route_id integer NOT NULL,
    admin_id integer
);

ALTER TABLE public.train OWNER TO postgres;

CREATE TABLE public.train_class (
    class_code integer NOT NULL,
    train_code integer NOT NULL
);

ALTER TABLE public.train_class OWNER TO postgres;

ALTER TABLE ONLY public.admin
    ADD CONSTRAINT admin_pkey PRIMARY KEY (admin_id);

ALTER TABLE ONLY public.train_class
    ADD CONSTRAINT class_pkey PRIMARY KEY (class_code, train_code);

ALTER TABLE ONLY public.class
    ADD CONSTRAINT class_pkey1 PRIMARY KEY (class_code);

ALTER TABLE ONLY public.distance_storage
    ADD CONSTRAINT fare_pkey PRIMARY KEY (from_station, to_station);

ALTER TABLE ONLY public.layout
    ADD CONSTRAINT layout_pkey PRIMARY KEY (layout_id);

ALTER TABLE ONLY public.passenger
    ADD CONSTRAINT passenger_pkey PRIMARY KEY (user_id);

ALTER TABLE ONLY public.payment_history
    ADD CONSTRAINT payment_history_pkey PRIMARY KEY (payment_id);

ALTER TABLE ONLY public.refund_history
    ADD CONSTRAINT refund_history_pkey PRIMARY KEY (refund_id);

ALTER TABLE ONLY public.route
    ADD CONSTRAINT route_pkey PRIMARY KEY (route_id);

ALTER TABLE ONLY public.route_station
    ADD CONSTRAINT route_station_pkey PRIMARY KEY (station_id, route_id);

ALTER TABLE ONLY public.seat_coordinate
    ADD CONSTRAINT seat_coordinate_pkey PRIMARY KEY (layout_id, seat_name);

ALTER TABLE ONLY public.seat
    ADD CONSTRAINT seat_pkey PRIMARY KEY (class_code, train_code);

ALTER TABLE ONLY public.seat_reservation
    ADD CONSTRAINT seat_reservation_pkey PRIMARY KEY (ticket_id, seat_number, class_code, train_code);

ALTER TABLE ONLY public.station
    ADD CONSTRAINT station_pkey PRIMARY KEY (station_id);

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_pkey PRIMARY KEY (ticket_id);

ALTER TABLE ONLY public.time_table
    ADD CONSTRAINT time_table_pkey PRIMARY KEY (train_code, station_id);

ALTER TABLE ONLY public.train
    ADD CONSTRAINT train_pkey PRIMARY KEY (train_code);

ALTER TABLE ONLY public.seat_reservation
    ADD CONSTRAINT unique_exact_seat_reservation UNIQUE (seat_number, class_code, train_code, from_station, to_station, date);

CREATE TRIGGER trg_delete_seat_reservations BEFORE DELETE ON public.ticket FOR EACH ROW EXECUTE FUNCTION public.delete_seat_reservations_for_ticket();

CREATE TRIGGER trg_delete_tickets BEFORE DELETE ON public.passenger FOR EACH ROW EXECUTE FUNCTION public.delete_tickets_for_passenger();

CREATE TRIGGER trg_handle_ticket_delete AFTER DELETE ON public.ticket FOR EACH ROW EXECUTE FUNCTION public.handle_ticket_delete();

CREATE TRIGGER trg_insert_payment_history AFTER INSERT ON public.ticket FOR EACH ROW EXECUTE FUNCTION public.insert_payment_history_on_ticket();

ALTER TABLE ONLY public.train_class
    ADD CONSTRAINT class_train_code_fkey FOREIGN KEY (train_code) REFERENCES public.train(train_code);

ALTER TABLE ONLY public.train_class
    ADD CONSTRAINT fk_class_train_class FOREIGN KEY (class_code) REFERENCES public.class(class_code);

ALTER TABLE ONLY public.layout
    ADD CONSTRAINT layout_class_code_train_code_fkey FOREIGN KEY (class_code, train_code) REFERENCES public.train_class(class_code, train_code);

ALTER TABLE ONLY public.route_station
    ADD CONSTRAINT route_station_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.route(route_id);

ALTER TABLE ONLY public.route_station
    ADD CONSTRAINT route_station_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.station(station_id);

ALTER TABLE ONLY public.seat
    ADD CONSTRAINT seat_class_code_train_code_fkey FOREIGN KEY (class_code, train_code) REFERENCES public.train_class(class_code, train_code);

ALTER TABLE ONLY public.seat_coordinate
    ADD CONSTRAINT seat_coordinate_layout_id_fkey FOREIGN KEY (layout_id) REFERENCES public.layout(layout_id);

ALTER TABLE ONLY public.seat_reservation
    ADD CONSTRAINT seat_reservation_class_train_fkey FOREIGN KEY (class_code, train_code) REFERENCES public.seat(class_code, train_code);

ALTER TABLE ONLY public.seat_reservation
    ADD CONSTRAINT seat_reservation_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.ticket(ticket_id);

ALTER TABLE ONLY public.ticket
    ADD CONSTRAINT ticket_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.passenger(user_id);

ALTER TABLE ONLY public.time_table
    ADD CONSTRAINT time_table_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(admin_id);

ALTER TABLE ONLY public.time_table
    ADD CONSTRAINT time_table_station_id_fkey FOREIGN KEY (station_id) REFERENCES public.station(station_id);

ALTER TABLE ONLY public.time_table
    ADD CONSTRAINT time_table_train_code_fkey FOREIGN KEY (train_code) REFERENCES public.train(train_code);

ALTER TABLE ONLY public.train
    ADD CONSTRAINT train_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.admin(admin_id);

ALTER TABLE ONLY public.train
    ADD CONSTRAINT train_route_id_fkey FOREIGN KEY (route_id) REFERENCES public.route(route_id);
